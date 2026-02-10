import { db } from "../../db";
import { budgets } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/auth";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const list = await db.select().from(budgets).where(eq(budgets.userId, userId));
  return jsonResponse(list);
}
