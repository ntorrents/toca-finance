import { getUserIdFromRequest, jsonResponse, errorResponse } from "../lib/simple-auth";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return errorResponse("No autorizado", 401);
  return jsonResponse({ authenticated: true, userId });
}
