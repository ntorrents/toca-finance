import { getSessionIdFromCookie } from "../lib/simple-auth.js";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  getSessionIdFromCookie(cookieHeader);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    },
  });
}
