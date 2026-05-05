import { db } from "../../db/index.js";
import { importLogs } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth.js";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return errorResponse("No autorizado", 401);

    const limit = Math.min(50, Math.max(1, parseInt(new URL(request.url).searchParams.get("limit") ?? "20", 10)));

    const rows = await db
      .select()
      .from(importLogs)
      .where(eq(importLogs.userId, userId))
      .orderBy(desc(importLogs.createdAt))
      .limit(limit);

    return jsonResponse({ logs: rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
}
