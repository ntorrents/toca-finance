import { db } from "../../db/index.js";
import { transactions, budgets } from "../../db/schema.js";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth.js";

function monthBounds(ym: string): { start: string; end: string } {
  const start = `${ym}-01`;
  const lastDay = new Date(parseInt(ym.slice(0, 4), 10), parseInt(ym.slice(5, 7), 10), 0);
  const end = `${ym}-${String(lastDay.getDate()).padStart(2, "0")}`;
  return { start, end };
}

/** Mes anterior en formato YYYY-MM */
function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // YYYY-MM

    const { start, end } = monthBounds(month);
    const prevYm = previousMonth(month);
    const { start: prevStart, end: prevEnd } = monthBounds(prevYm);

    const expenses = await db
      .select({
        category: transactions.category,
        total: sql<string>`CAST(SUM(${transactions.amount}) AS DECIMAL(12,2))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      )
      .groupBy(transactions.category);

    const budgetsList = await db.select().from(budgets).where(eq(budgets.userId, userId));

    const budgetMap = Object.fromEntries(budgetsList.map((b) => [b.category, Number(b.monthlyLimit)]));
    const expenseMap = Object.fromEntries(expenses.map((e) => [e.category, Number(e.total)]));

    const categories = [...new Set([...Object.keys(budgetMap), ...Object.keys(expenseMap)])];
    const realVsBudget = categories.map((cat) => ({
      category: cat,
      real: expenseMap[cat] ?? 0,
      budget: budgetMap[cat] ?? 0,
    }));

    const [expenseSumRow] = await db
      .select({
        total: sql<string>`COALESCE(CAST(SUM(${transactions.amount}) AS DECIMAL(12,2)), '0')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      );

    const [incomeSumRow] = await db
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

    const [prevExpenseSumRow] = await db
      .select({
        total: sql<string>`COALESCE(CAST(SUM(${transactions.amount}) AS DECIMAL(12,2)), '0')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, prevStart),
          lte(transactions.date, prevEnd)
        )
      );

    const totalExpenses = Number(expenseSumRow?.total ?? 0);
    const totalIncome = Number(incomeSumRow?.total ?? 0);
    const previousMonthExpenses = Number(prevExpenseSumRow?.total ?? 0);
    const expenseMomPct =
      previousMonthExpenses > 0
        ? ((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
        : null;

    const totalBudgetPlanned = budgetsList.reduce((acc, b) => acc + Number(b.monthlyLimit), 0);

    return jsonResponse({
      month,
      previousMonth: prevYm,
      realVsBudget,
      expenses,
      budgets: budgetsList,
      summary: {
        totalExpenses,
        totalIncome,
        previousMonthExpenses,
        expenseMonthOverMonthPct: expenseMomPct,
        totalBudgetPlanned,
        budgetVariance: totalBudgetPlanned - totalExpenses,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
}
