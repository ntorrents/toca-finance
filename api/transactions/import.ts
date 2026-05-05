import { db } from "../../db/index.js";
import { transactions, importLogs } from "../../db/schema.js";
import { categorizeFromConcept } from "../../db/categorize.js";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth.js";
import Papa from "papaparse";
import XLSX from "xlsx";
import { createHash } from "crypto";

function hashRow(date: string, amount: string, concept: string): string {
  return createHash("sha256").update(`${date}|${amount}|${concept}`).digest("hex");
}

/** Parsea importe en español ("701,07" o "-600,00") o número Excel */
function parseAmount(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const s = String(val ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** Convierte número serial de Excel (días desde 1899-12-30) a YYYY-MM-DD */
function excelSerialToISO(val: number): string {
  const n = Math.floor(val);
  // Rango típico fechas 1990–2050 en serial Excel
  if (n < 30000 || n > 65000) return "";
  const utc = new Date((n - 25569) * 86400 * 1000);
  if (Number.isNaN(utc.getTime())) return "";
  return utc.toISOString().slice(0, 10);
}

/** Fecha calendario en España (evita desfases UTC en exports bancarios .xls/.xlsx) */
function dateToISOEuropeMadrid(val: Date): string {
  return val.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

/** Convierte valor de celda a YYYY-MM-DD (texto, Date, serial Excel) */
function toISODate(val: unknown): string {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return dateToISOEuropeMadrid(val);
  }
  if (typeof val === "number" && !Number.isNaN(val)) {
    const asSerial = excelSerialToISO(val);
    if (asSerial) return asSerial;
  }
  const s = String(val ?? "").trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0, 10);
  return "";
}

function rowCellsLower(row: unknown[]): string[] {
  return row.map((c) => String(c ?? "").toLowerCase());
}

/** Fila de cabecera: debe incluir concepto e importe (como en pestaña Extracto) */
function findHeaderRowIndex(rawRows: unknown[][]): number {
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    if (!row || row.length === 0) continue;
    const cells = rowCellsLower(row);
    const joined = cells.join("|");
    if (/concepto/.test(joined) && (/importe/.test(joined) || /amount/.test(joined))) {
      return i;
    }
  }
  return -1;
}

/**
 * Elige la hoja de movimientos: primero por nombre (Extracto, export Unicaja…),
 * luego la primera que tenga cabecera Concepto + Importe (evita coger «Reforma» antes que «Extracto»).
 */
function pickSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const names = workbook.SheetNames;

  const trySheet = (name: string): XLSX.WorkSheet | null => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return null;
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
    }) as unknown[][];
    return findHeaderRowIndex(rawRows) >= 0 ? sheet : null;
  };

  const namePredicates = [
    (n: string) => /^extracto$/i.test(n.trim()),
    (n: string) => /movimientos.*cuenta|cuenta.*3789/i.test(n.replace(/\s+/g, " ")),
    (n: string) => /movimientos/i.test(n),
    (n: string) => /unicaja/i.test(n),
  ];

  for (const pred of namePredicates) {
    const hit = names.find(pred);
    if (hit) {
      const sheet = trySheet(hit);
      if (sheet) return sheet;
    }
  }

  const looseName = names.find((n) => /extracto|movimientos/i.test(n.trim()));
  if (looseName) {
    const sheet = trySheet(looseName);
    if (sheet) return sheet;
  }

  for (const name of names) {
    const sheet = trySheet(name);
    if (sheet) return sheet;
  }

  return names[0] ? workbook.Sheets[names[0]] : null;
}

function sheetToObjects(sheet: XLSX.WorkSheet): Array<Record<string, unknown>> {
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  }) as unknown[][];
  const hi = findHeaderRowIndex(rawRows);
  if (hi < 0 || hi >= rawRows.length - 1) {
    return [];
  }
  const headers = (rawRows[hi] as unknown[]).map((h) => String(h ?? "").trim());
  return rawRows.slice(hi + 1).map((r) => {
    const row = r as unknown[];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[h] = row[i];
      obj[h.toLowerCase()] = row[i];
    });
    return obj;
  });
}

function rowFromCsvRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(row)) {
    out[key.toLowerCase()] = row[key as keyof typeof row];
  }
  return out;
}

async function recordImportLog(
  userId: string,
  payload: {
    fileName: string;
    status: "completed" | "failed";
    inserted: number;
    skipped: number;
    errorMessage?: string | null;
  }
) {
  try {
    await db.insert(importLogs).values({
      userId,
      fileName: payload.fileName,
      status: payload.status,
      inserted: payload.inserted,
      skipped: payload.skipped,
      errorMessage: payload.errorMessage ?? null,
    });
  } catch (err) {
    console.error("import_logs:", err);
  }
}

function isDuplicateInsertError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as {
      code?: string;
      cause?: { code?: string; detail?: string; constraint?: string };
      message?: string;
    };
    return (
      err.code === "23505" ||
      err.cause?.code === "23505" ||
      /duplicate|unique|already exists/i.test(err.message ?? "") ||
      /duplicate|already exists/i.test(err.cause?.detail ?? "") ||
      /transactions_user_hash_idx/i.test(err.cause?.constraint ?? "")
    );
  }
  return /duplicate|unique|already exists/i.test(String(error));
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const csv = formData.get("csv") as string | null;
    const fileLabel = file?.name ?? (csv ? "texto-pegar.csv" : "archivo");

    let rows: Array<Record<string, unknown>> = [];

    if (file) {
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "xls" || ext === "xlsx") {
        const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
        const sheet = pickSheet(workbook);
        if (!sheet) {
          await recordImportLog(userId, {
            fileName: fileLabel,
            status: "failed",
            inserted: 0,
            skipped: 0,
            errorMessage: "No se pudo leer ninguna hoja del Excel",
          });
          return errorResponse("No se pudo leer ninguna hoja del Excel");
        }
        rows = sheetToObjects(sheet);
      } else {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        rows = parsed.data.map((r) => rowFromCsvRecord(r as Record<string, unknown>));
      }
    } else if (csv) {
      const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
      rows = parsed.data.map((r) => rowFromCsvRecord(r as Record<string, unknown>));
    } else {
      return errorResponse("Envía un archivo (CSV/Excel) o el contenido CSV");
    }

    rows = rows.filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));

    if (rows.length === 0) {
      await recordImportLog(userId, {
        fileName: fileLabel,
        status: "failed",
        inserted: 0,
        skipped: 0,
        errorMessage: "Sin filas de datos",
      });
      return errorResponse("No se encontraron datos (revisa la pestaña Extracto o la fila de cabecera)");
    }

    const toInsert: Array<{
      userId: string;
      date: string;
      concept: string;
      amount: string;
      category: string;
      type: string;
      source: string;
      transactionHash: string;
    }> = [];

    for (const row of rows) {
      const raw = row as Record<string, unknown>;

      let date = "";
      for (const key of Object.keys(raw)) {
        if (/fecha|date|operaci|valor/i.test(key)) {
          const val = raw[key];
          const d = toISODate(val);
          if (d) {
            date = d;
            break;
          }
        }
      }
      if (!date) continue;

      let concept = "";
      for (const key of Object.keys(raw)) {
        if (/concepto|concept|description|descripcion/i.test(key)) {
          concept = String(raw[key] ?? "").trim();
          if (concept) break;
        }
      }
      if (!concept) continue;

      let amountNum = 0;
      for (const key of Object.keys(raw)) {
        if (/importe|amount|monto|cantidad/i.test(key)) {
          amountNum = parseAmount(raw[key]);
          if (amountNum !== 0) break;
        }
      }
      if (amountNum === 0) continue;

      const type = amountNum >= 0 ? "income" : "expense";
      const amountStr = Math.abs(amountNum).toFixed(2);

      let category = "";
      for (const key of Object.keys(raw)) {
        if (/categoria|category/i.test(key)) {
          category = String(raw[key] ?? "").trim();
          break;
        }
      }
      if (!category || category === "Otros") category = categorizeFromConcept(concept);

      const transactionHash = hashRow(date, amountStr, concept);
      toInsert.push({
        userId,
        date,
        concept,
        amount: amountStr,
        category,
        type,
        source: "excel",
        transactionHash,
      });
    }

    if (toInsert.length === 0) {
      await recordImportLog(userId, {
        fileName: fileLabel,
        status: "failed",
        inserted: 0,
        skipped: 0,
        errorMessage: "Ningún movimiento válido (fecha, concepto e importe)",
      });
      return errorResponse("No se importó ningún movimiento válido");
    }

    let inserted = 0;
    let skipped = 0;
    for (const row of toInsert) {
      try {
        await db.insert(transactions).values(row).execute();
        inserted++;
      } catch (e) {
        if (isDuplicateInsertError(e)) skipped++;
        else {
          await recordImportLog(userId, {
            fileName: fileLabel,
            status: "failed",
            inserted,
            skipped,
            errorMessage: e instanceof Error ? e.message : String(e),
          });
          throw e;
        }
      }
    }

    await recordImportLog(userId, {
      fileName: fileLabel,
      status: "completed",
      inserted,
      skipped,
    });

    return jsonResponse({ inserted, skipped, total: toInsert.length });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : String(e), 500);
  }
}
