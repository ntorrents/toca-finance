import { errorResponse } from "../lib/simple-auth";
import { verifyPassword, createSession, setSessionCookie } from "../lib/simple-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email y contraseña requeridos", 400);
    }

    if (email !== process.env.ADMIN_EMAIL) {
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
