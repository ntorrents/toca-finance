import { db } from "../../db";
import { transactions } from "../../db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth";

/** Agrupa categorías como en el cliente (duplicado mínimo por no importar desde src en api serverless) */
function categoryToMacro(category: string): "necesidades" | "deseos" | "caprichos" | "mascotas" | "otros" {
  const c = (category || "").toLowerCase();
  if (/mascota|perro|gato|veterinar|pet|pienso/i.test(c)) return "mascotas";
  if (
    /supermercado|farmacia|gasolina|internet|hipoteca|hogar|llum|aigua|gas|comunitat|ibi|parking|deloitte|c3linic|ahorro|tren|nomina|nómina|salud|impuesto|certificat|gestiones/i.test(
      c
    )
  )
    return "necesidades";
  if (/comida|bar|restaurant|cafeteria|sushi|ocio|netflix|vacaciones|cine|vod|viaje|viatjar|menjar fora/i.test(c))
    return "deseos";
  if (/regalo|multa|bizum|donatiu|ropa|compras casa|validar|peluqueria/i.test(c)) return "caprichos";
  return "otros";
}

function monthBounds(ym: string): { start: string; end: string } {
  const start = `${ym}-01`;
  const lastDay = new Date(parseInt(ym.slice(0, 4), 10), parseInt(ym.slice(5, 7), 10), 0);
  const end = `${ym}-${String(lastDay.getDate()).padStart(2, "0")}`;
  return { start, end };
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const { start, end } = monthBounds(month);

    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      );

    const byMacro: Record<string, number> = {
      necesidades: 0,
      deseos: 0,
      caprichos: 0,
      mascotas: 0,
      otros: 0,
    };
    for (const r of rows) {
      const m = categoryToMacro(r.category);
      byMacro[m] += Number(r.amount);
    }

    const last6: { month: string; totalExpenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ym = shiftMonth(month, -i);
      const b = monthBounds(ym);
      const [row] = await db
        .select({
          total: sql<string>`COALESCE(CAST(SUM(${transactions.amount}) AS DECIMAL(12,2)), '0')`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "expense"),
            gte(transactions.date, b.start),
            lte(transactions.date, b.end)
          )
        );
      last6.push({ month: ym, totalExpenses: Number(row?.total ?? 0) });
    }

    const [incomeRow] = await db
      .select({
        total: sql<string>`COALESCE(CAST(SUM(${transactions.amount}) AS DECIMAL(12,2)), '0')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      );

    const totalExpenses = rows.reduce((a, r) => a + Number(r.amount), 0);
    const totalIncome = Number(incomeRow?.total ?? 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;

    const prevYm = shiftMonth(month, -1);
    const pb = monthBounds(prevYm);
    const prevRows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, pb.start),
          lte(transactions.date, pb.end)
        )
      );
    const prevByMacro: Record<string, number> = {
      necesidades: 0,
      deseos: 0,
      caprichos: 0,
      mascotas: 0,
      otros: 0,
    };
    for (const r of prevRows) {
      prevByMacro[categoryToMacro(r.category)] += Number(r.amount);
    }

    let alertMacro: string | null = null;
    let alertPct: number | null = null;
    for (const key of Object.keys(byMacro)) {
      const cur = byMacro[key];
      const prev = prevByMacro[key] ?? 0;
      if (prev > 0 && cur > prev) {
        const pct = ((cur - prev) / prev) * 100;
        if (pct >= 10 && (!alertPct || pct > alertPct)) {
          alertPct = pct;
          alertMacro = key;
        }
      }
    }

    return jsonResponse({
      month,
      byMacro,
      spendingByMonth: last6,
      savingsRate,
      alert:
        alertMacro && alertPct !== null
          ? { macro: alertMacro, pctChange: Math.round(alertPct * 10) / 10 }
          : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
}
