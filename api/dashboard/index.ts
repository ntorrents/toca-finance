import { db } from "../../db";
import { transactions, budgets } from "../../db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/auth";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const start = `${month}-01`;
  const lastDay = new Date(parseInt(month.slice(0, 4), 10), parseInt(month.slice(5, 7), 10), 0);
  const end = `${month}-${String(lastDay.getDate()).padStart(2, "0")}`;

  // Gasto real por categoría (solo expense) en el mes
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

  return jsonResponse({
    month,
    realVsBudget,
    expenses,
    budgets: budgetsList,
  });
}
