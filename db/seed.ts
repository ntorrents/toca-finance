/**
 * Nil Finance - Seed de base de datos
 * Lee "Plan de gastos.xlsx" y popula budgets y debt_amortization.
 *
 * Uso: npm run db:seed
 * Opcional: EXCEL_PATH=./ruta/a/Plan de gastos.xlsx npm run db:seed
 * Opcional: SEED_USER_ID=user_xxx (Clerk user id; si no se pasa, se usa un placeholder para pruebas)
 */
import "dotenv/config";
import * as XLSX from "xlsx";
import { db } from "./index";
import { budgets, debtAmortization } from "./schema";

const EXCEL_PATH = process.env.EXCEL_PATH ?? "./Plan de gastos.xlsx";
const SEED_USER_ID = process.env.SEED_USER_ID ?? "seed-user-placeholder";

function readExcel(path: string) {
  const workbook = XLSX.readFile(path);
  return workbook;
}

async function seedBudgetsFromSheet(workbook: XLSX.WorkBook) {
  // Buscar hoja de presupuestos: "Presupuesto", "Budgets", "Gastos" o primera hoja
  const sheetNames = workbook.SheetNames;
  const budgetSheetName =
    sheetNames.find(
      (n) =>
        /presupuesto|budget|gastos|limite/i.test(n) || /plan/i.test(n)
    ) ?? sheetNames[0];

  const sheet = workbook.Sheets[budgetSheetName];
  if (!sheet) return;

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (data.length === 0) return;

  // Detectar columnas: category/categoría, monthly_limit/límite/mes/limit
  const first = data[0] as Record<string, unknown>;
  const categoryKey =
    Object.keys(first).find(
      (k) =>
        /categor[ií]a|category/i.test(k) || /concepto|concept/i.test(k)
    ) ?? Object.keys(first)[0];
  const limitKey =
    Object.keys(first).find(
      (k) =>
        /l[ií]mite|limit|mensual|monthly|presupuesto|budget/i.test(k)
    ) ?? Object.keys(first)[1];

  if (!categoryKey) return;

  const rows = data
    .map((row) => {
      const category = String((row as Record<string, unknown>)[categoryKey] ?? "").trim();
      const rawLimit = (row as Record<string, unknown>)[limitKey];
      if (!category) return null;
      const monthlyLimit = Number(rawLimit) || 0;
      return { userId: SEED_USER_ID, category, monthlyLimit: String(monthlyLimit) };
    })
    .filter((r): r is { userId: string; category: string; monthlyLimit: string } => r !== null && r.monthlyLimit !== "0");

  if (rows.length > 0) {
    await db.insert(budgets).values(rows).execute();
    console.log(`[seed] Insertados ${rows.length} presupuestos desde hoja "${budgetSheetName}".`);
  }
}

async function seedDebtFromSheet(workbook: XLSX.WorkBook) {
  const sheetNames = workbook.SheetNames;
  const debtSheetName = sheetNames.find(
    (n) => /deuda|debt|amortizaci[oó]n|pr[eé]stamo|loan/i.test(n)
  );
  if (!debtSheetName) return;

  const sheet = workbook.Sheets[debtSheetName];
  if (!sheet) return;

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    dateNF: "yyyy-mm-dd",
    defval: "",
  });
  if (data.length === 0) return;

  const first = data[0] as Record<string, unknown>;
  const dateKey = Object.keys(first).find((k) => /fecha|date/i.test(k)) ?? Object.keys(first)[0];
  const capitalKey = Object.keys(first).find((k) => /capital|pendiente|pending/i.test(k)) ?? Object.keys(first)[1];
  const interestKey = Object.keys(first).find((k) => /inter[eé]s|interest/i.test(k)) ?? Object.keys(first)[2];
  const loanKey = Object.keys(first).find((k) => /pr[eé]stamo|loan|nombre|name/i.test(k)) ?? "loan";

  const rows = data
    .map((row) => {
      const raw = row as Record<string, unknown>;
      const dateVal = raw[dateKey];
      let dateStr: string;
      if (dateVal instanceof Date) dateStr = dateVal.toISOString().slice(0, 10);
      else if (typeof dateVal === "number") {
        const d = new Date((dateVal - 25569) * 86400 * 1000); // Excel epoch
        dateStr = d.toISOString().slice(0, 10);
      } else dateStr = String(dateVal ?? "").slice(0, 10);
      const capitalPending = String(Number(raw[capitalKey]) || 0);
      const interest = String(Number(raw[interestKey]) || 0);
      const loanName = String(raw[loanKey] ?? "Préstamo").trim();
      if (!dateStr) return null;
      return {
        userId: SEED_USER_ID,
        date: dateStr,
        capitalPending,
        interest,
        loanName,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    await db.insert(debtAmortization).values(rows).execute();
    console.log(`[seed] Insertadas ${rows.length} filas de amortización desde hoja "${debtSheetName}".`);
  }
}

async function main() {
  console.log("[seed] Leyendo Excel:", EXCEL_PATH);
  const workbook = readExcel(EXCEL_PATH);
  await seedBudgetsFromSheet(workbook);
  await seedDebtFromSheet(workbook);
  console.log("[seed] Listo.");
}

main().catch((e) => {
  console.error("[seed] Error:", e);
  process.exit(1);
});
