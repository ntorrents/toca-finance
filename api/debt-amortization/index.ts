import { db } from "../../db";
import { debtAmortization } from "../../db/schema";
import { eq, asc } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/auth";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);

  const list = await db
    .select()
    .from(debtAmortization)
    .where(eq(debtAmortization.userId, userId))
    .orderBy(asc(debtAmortization.date));
  return jsonResponse(list);
}
