import { db } from "../../db/index.js";
import { transactions } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth.js";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const month = searchParams.get("month"); // YYYY-MM
    const q = searchParams.get("q")?.trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

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
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.concept || "").toLowerCase().includes(q) ||
          (r.category || "").toLowerCase().includes(q)
      );
    }

    const total = rows.length;
    const paged = rows.slice(offset, offset + limit);

    return jsonResponse({
      transactions: paged,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
}
