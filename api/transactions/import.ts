import { db } from "../../db";
import { transactions } from "../../db/schema";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/auth";
import Papa from "papaparse";
import { createHash } from "crypto";

function hashRow(date: string, amount: string, concept: string): string {
  return createHash("sha256").update(`${date}|${amount}|${concept}`).digest("hex");
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  let body: { csv?: string; rows?: Array<{ date: string; concept: string; amount: number; category: string; type: string }> };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Body JSON inválido");
  }

  const rows = body.rows ?? (body.csv ? Papa.parse<Record<string, string>>(body.csv, { header: true }).data : []);
  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse("Envía 'csv' (string) o 'rows' (array de objetos con date, concept, amount, category, type)");
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
    const date = String(raw.date ?? raw.fecha ?? raw.Date ?? "").trim().slice(0, 10);
    const concept = String(raw.concept ?? raw.concepto ?? raw.description ?? raw.descripcion ?? "").trim();
    const amount = Number(raw.amount ?? raw.importe ?? raw.monto ?? raw.amount ?? 0);
    const category = String(raw.category ?? raw.categoria ?? raw.category ?? "Otros").trim();
    const type = String(raw.type ?? raw.tipo ?? "expense").toLowerCase() === "income" ? "income" : "expense";
    if (!date || !concept) continue;
    const amountStr = amount.toFixed(2);
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
