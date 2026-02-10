import { db } from "../../db";
import { transactions } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/auth";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const month = searchParams.get("month"); // YYYY-MM
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Filtros aplicados en memoria por simplicidad; para producción usar .where() compuesto
  let rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date));

  if (category) {
    rows = rows.filter((r) => r.category === category);
  }
  if (month) {
    rows = rows.filter((r) => r.date?.startsWith(month));
  }

  const total = rows.length;
  const paged = rows.slice(offset, offset + limit);

  return jsonResponse({
    transactions: paged,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
