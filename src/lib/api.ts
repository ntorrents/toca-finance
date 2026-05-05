function getApiBase(): string {
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  // Si está vacío o mal formado, usa mismo origen.
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";
  return raw.replace(/\/$/, "");
}

const API_BASE = getApiBase();

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // Incluir cookies
    headers: {
      ...options.headers,
    },
  });
}

async function safeJson<T>(r: Response): Promise<T> {
  const contentType = r.headers.get("content-type") ?? "";
  const text = await r.text();
  if (!contentType.includes("application/json")) {
    const msg = r.ok
      ? "La API no devolvió JSON."
      : r.status === 500
        ? "Error 500 en la API. Revisa la terminal donde corre 'vercel dev' para ver el error (base de datos, variables .env)."
        : `API error (${r.status}).`;
    throw new Error(msg);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || "Respuesta inválida");
  }
}

export const api = {
  transactions: {
    list: (params?: { category?: string; month?: string; page?: number; limit?: number; q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.category) sp.set("category", params.category);
      if (params?.month) sp.set("month", params.month);
      if (params?.page) sp.set("page", String(params.page));
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.q) sp.set("q", params.q);
      return fetchWithAuth(`/api/transactions?${sp}`).then(safeJson);
    },
    importFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetchWithAuth("/api/transactions/import", {
        method: "POST",
        body: formData,
      }).then(safeJson);
    },
    importCsv: (csv: string) => {
      const formData = new FormData();
      formData.append("csv", csv);
      return fetchWithAuth("/api/transactions/import", {
        method: "POST",
        body: formData,
      }).then(safeJson);
    },
  },
  budgets: {
    list: () => fetchWithAuth("/api/budgets").then(safeJson),
    importFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetchWithAuth("/api/budgets/import", {
        method: "POST",
        body: formData,
      }).then(safeJson);
    },
  },
  debtAmortization: () => fetchWithAuth("/api/debt-amortization").then(safeJson),
  dashboard: (month?: string) =>
    fetchWithAuth(`/api/dashboard${month ? `?month=${month}` : ""}`).then(safeJson),
  analytics: (month?: string) =>
    fetchWithAuth(`/api/analytics${month ? `?month=${month}` : ""}`).then(safeJson),
  importLogs: (limit?: number) => {
    const sp = new URLSearchParams();
    if (limit) sp.set("limit", String(limit));
    return fetchWithAuth(`/api/import-logs?${sp}`).then(safeJson);
  },
};
