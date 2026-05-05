import { errorResponse } from "../lib/simple-auth";
import { verifyPassword, createSession, setSessionCookie } from "../lib/simple-auth";

export async function POST(request: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      return errorResponse("Cuerpo JSON inválido", 400);
    }
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return errorResponse("Email y contraseña requeridos", 400);
    }

    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim();
    if (!adminEmail) {
      return errorResponse("Servidor sin ADMIN_EMAIL configurado", 500);
    }

    if (email !== adminEmail) {
      return errorResponse("Credenciales inválidas", 401);
    }

    if (!verifyPassword(password)) {
      return errorResponse("Credenciales inválidas", 401);
    }

    const sessionId = createSession(email);
    const cookie = setSessionCookie(sessionId);

    return new Response(
      JSON.stringify({ success: true, userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}` }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Error en login", 500);
  }
}
