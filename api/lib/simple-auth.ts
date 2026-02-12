/**
 * Autenticación simple sin Clerk
 * Para uso personal: email/password desde .env
 */
import { createHash, randomBytes } from "crypto";
import path from "path";
import dotenv from "dotenv";

// Cargar .env
const __dirname = path.dirname(new URL(import.meta.url).pathname);
for (const envPath of [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), ".env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
]) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? createHash("sha256").update("admin123").digest("hex");
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");

// Sesiones en memoria (en producción usar Redis o DB)
const sessions = new Map<string, { userId: string; email: string; expires: number }>();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function createSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function verifyPassword(password: string): boolean {
  return hashPassword(password) === ADMIN_PASSWORD_HASH;
}

export function createSession(email: string): string {
  const sessionId = createSessionId();
  sessions.set(sessionId, {
    userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
    email,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
  });
  return sessionId;
}

export function getSession(sessionId: string): { userId: string; email: string } | null {
  const session = sessions.get(sessionId);
  if (!session || session.expires < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return { userId: session.userId, email: session.email };
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith("session="));
  return sessionCookie ? sessionCookie.split("=")[1] : null;
}

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = getSessionIdFromCookie(cookieHeader);
  if (!sessionId) return null;
  const session = getSession(sessionId);
  return session?.userId ?? null;
}

export function setSessionCookie(sessionId: string): string {
  return `session=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
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
