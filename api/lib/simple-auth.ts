/**
 * Autenticación simple sin Clerk
 * Para uso personal: email/password desde .env
 */
import { createHash, createHmac, timingSafeEqual, randomBytes } from "crypto";
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
const ADMIN_PASSWORD_HASH = (
  process.env.ADMIN_PASSWORD_HASH ?? createHash("sha256").update("admin123").digest("hex")
)
  .trim()
  .toLowerCase();
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string): boolean {
  return hashPassword(password).toLowerCase() === ADMIN_PASSWORD_HASH;
}

function signSessionPayload(payload: string): string {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSession(email: string): string {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({
    email,
    userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
    expires,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signSessionPayload(encoded);
  return `${encoded}.${signature}`;
}

export function getSession(sessionToken: string): { userId: string; email: string } | null {
  const [encoded, signature] = sessionToken.split(".");
  if (!encoded || !signature) return null;

  const expected = signSessionPayload(encoded);
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      email?: string;
      userId?: string;
      expires?: number;
    };
    if (!parsed.email || !parsed.userId || !parsed.expires) return null;
    if (parsed.expires < Date.now()) return null;
    return { userId: parsed.userId, email: parsed.email };
  } catch {
    return null;
  }
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
