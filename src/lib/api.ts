const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchWithAuth(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<Response> {
  const { token, ...rest } = options as RequestInit & { token?: string };
  const headers = new Headers(rest.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...rest, headers });
}

export const api = {
  transactions: {
    list: (token: string, params?: { category?: string; month?: string; page?: number }) => {
      const sp = new URLSearchParams();
      if (params?.category) sp.set("category", params.category);
      if (params?.month) sp.set("month", params.month);
      if (params?.page) sp.set("page", String(params.page));
      return fetchWithAuth(`/api/transactions?${sp}`, { token }).then((r) => r.json());
    },
    importCsv: (token: string, body: { csv?: string; rows?: unknown[] }) =>
      fetchWithAuth("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        token,
      }).then((r) => r.json()),
  },
  budgets: (token: string) =>
    fetchWithAuth("/api/budgets", { token }).then((r) => r.json()),
  debtAmortization: (token: string) =>
    fetchWithAuth("/api/debt-amortization", { token }).then((r) => r.json()),
  dashboard: (token: string, month?: string) =>
    fetchWithAuth(`/api/dashboard${month ? `?month=${month}` : ""}`, { token }).then((r) =>
      r.json()
    ),
};
