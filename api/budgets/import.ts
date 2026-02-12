import { db } from "../../db";
import { budgets } from "../../db/schema";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth";
import XLSX from "xlsx";
import { eq } from "drizzle-orm";

/** Extrae pares concepto–importe de columnas A-B y D-E (hoja tipo "0. Gastos global"). Duplicados: última ocurrencia gana. */
function extractBudgetPairsFromGastosGlobal(rows: unknown[][]): Array<{ category: string; monthlyLimit: number }> {
  const skipLabels = /^(Total|Balanç|Necessitem)\s*$/i;
  const map = new Map<string, number>();

  for (const r of rows) {
    const a = (r[0] ?? "").toString().trim();
    const b = r[1];
    const d = (r[4] ?? "").toString().trim();
    const e = r[5];
    const numB = typeof b === "number" ? b : parseFloat(String(b ?? "").replace(",", "."));
    const numE = typeof e === "number" ? e : parseFloat(String(e ?? "").replace(",", "."));
    if (a && !Number.isNaN(numB) && numB >= 0 && !skipLabels.test(a)) map.set(a, numB);
    if (d && !Number.isNaN(numE) && numE >= 0 && !skipLabels.test(d)) map.set(d, numE);
  }
  return Array.from(map.entries(), ([category, monthlyLimit]) => ({ category, monthlyLimit }));
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return errorResponse("Archivo requerido", 400);

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Buscar hoja "0. Gastos global"
  const gastosGlobalName = workbook.SheetNames.find((n) => /0\.\s*Gastos\s*global/i.test(n));
  if (!gastosGlobalName) {
    return errorResponse('No se encontró la hoja "0. Gastos global" en el Excel');
  }

  const sheet = workbook.Sheets[gastosGlobalName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  const pairs = extractBudgetPairsFromGastosGlobal(rows);

  if (pairs.length === 0) {
    return errorResponse("No se encontraron presupuestos en la hoja");
  }

  // Borrar presupuestos anteriores del usuario
  await db.delete(budgets).where(eq(budgets.userId, userId));

  // Insertar nuevos
  const values = pairs.map((p) => ({
    userId,
    category: p.category,
    monthlyLimit: String(p.monthlyLimit),
  }));

  await db.insert(budgets).values(values).execute();

  return jsonResponse({ inserted: values.length, categories: pairs.map((p) => p.category) });
}
