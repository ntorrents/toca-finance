import { getSessionIdFromCookie, deleteSession } from "../lib/simple-auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = getSessionIdFromCookie(cookieHeader);
  if (sessionId) {
    deleteSession(sessionId);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    },
  });
}
