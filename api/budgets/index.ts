import { db } from "../../db/index.js";
import { budgets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth.js";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const list = await db.select().from(budgets).where(eq(budgets.userId, userId));
    return jsonResponse(list);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
}
