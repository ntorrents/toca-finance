/**
 * Autenticación simple - cliente
 */
function getApiBase(): string {
  // En desarrollo: siempre mismo origen (Vite + proxy /api → vercel dev).
  // Así no llamas por error a producción por un VITE_API_URL del .env.
  if (import.meta.env.DEV) return "";

  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.replace(/\/$/, "");
}

const API_BASE = getApiBase();

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error ?? "Error en login" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error de conexión" };
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/check`, {
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
