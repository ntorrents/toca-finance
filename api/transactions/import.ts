import { db } from "../../db";
import { transactions } from "../../db/schema";
import { categorizeFromConcept } from "../../db/categorize";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth";
import Papa from "papaparse";
import XLSX from "xlsx";
import { createHash } from "crypto";

function hashRow(date: string, amount: string, concept: string): string {
  return createHash("sha256").update(`${date}|${amount}|${concept}`).digest("hex");
}

/** Parsea importe en español ("701,07" o "-600,00") o número */
function parseAmount(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const s = String(val ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** Convierte DD/MM/YYYY a YYYY-MM-DD */
function toISODate(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val ?? "").trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s.slice(0, 10);
  return "";
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const csv = formData.get("csv") as string | null;

  let rows: Array<Record<string, unknown>> = [];

  if (file) {
    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xls" || ext === "xlsx") {
      // Excel: cabecera en fila 1 (índice 0), datos desde fila 2 (índice 1)
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
      if (rawRows.length < 2) {
        return errorResponse("El Excel debe tener al menos una fila de cabecera y una de datos");
      }
      const headers = rawRows[0] as string[];
      rows = rawRows.slice(1).map((r) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h] = r[i];
        });
        return obj;
      });
    } else {
      // CSV: cabecera en fila 1, datos desde fila 2
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      rows = parsed.data;
    }
  } else if (csv) {
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    rows = parsed.data;
  } else {
    return errorResponse("Envía un archivo (CSV/Excel) o el contenido CSV");
  }

  if (rows.length === 0) {
    return errorResponse("No se encontraron datos");
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
    // Buscar columna de fecha (flexible)
    let date = "";
    for (const key of Object.keys(raw)) {
      const val = raw[key];
      if (/fecha|date|operativa|valor/i.test(key)) {
        date = toISODate(val);
        if (date) break;
      }
    }
    if (!date) continue;

    // Buscar concepto
    let concept = "";
    for (const key of Object.keys(raw)) {
      const val = raw[key];
      if (/concepto|concept|description|descripcion/i.test(key)) {
        concept = String(val ?? "").trim();
        if (concept) break;
      }
    }
    if (!concept) continue;

    // Buscar importe
    let amountNum = 0;
    for (const key of Object.keys(raw)) {
      const val = raw[key];
      if (/importe|amount|monto|cantidad/i.test(key)) {
        amountNum = parseAmount(val);
        if (amountNum !== 0) break;
      }
    }
    if (amountNum === 0) continue;

    const type = amountNum >= 0 ? "income" : "expense";
    const amountStr = Math.abs(amountNum).toFixed(2);
    let category = String(raw.category ?? raw.categoria ?? "").trim();
    if (!category || category === "Otros") category = categorizeFromConcept(concept);
    const transactionHash = hashRow(date, amountStr, concept);
    toInsert.push({
      userId,
      date,
      concept,
      amount: amountStr,
      category,
      type,
      source: "bank",
      transactionHash,
    });
  }

  let inserted = 0;
  let skipped = 0;
  for (const row of toInsert) {
    try {
      await db.insert(transactions).values(row).execute();
      inserted++;
    } catch (e) {
      if (String(e).includes("unique") || String(e).includes("duplicate")) skipped++;
      else throw e;
    }
  }

  return jsonResponse({ inserted, skipped, total: toInsert.length });
}
