import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { verifyToken } from "@clerk/backend";

// Cargar .env desde raíz del proyecto (vercel dev no siempre inyecta env en serverless)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), ".env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
]) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    console.log("[auth] No token en Authorization header");
    return null;
  }
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.log("[auth] CLERK_SECRET_KEY no definida");
    return null;
  }
  try {
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: ["http://localhost:3000", "http://127.0.0.1:3000", "https://*.vercel.app"],
    });
    console.log("[auth] Token válido, userId:", payload?.sub);
    return payload?.sub ?? null;
  } catch (e) {
    console.log("[auth] Error verificando token:", e instanceof Error ? e.message : String(e));
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
