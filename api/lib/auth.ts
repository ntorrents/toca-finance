import { verifyToken } from "@clerk/backend/jwt";

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const { data } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return data?.sub ?? null;
  } catch {
    return null;
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
