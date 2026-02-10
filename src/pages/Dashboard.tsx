import { useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { api } from "@/lib/api";

export function Dashboard() {
  const { getToken } = useAuth();
  const [dashboard, setDashboard] = useState<{
    month: string;
    realVsBudget: Array<{ category: string; real: number; budget: number }>;
    expenses: unknown[];
    budgets: unknown[];
  } | null>(null);
  const [debt, setDebt] = useState<Array<{ date: string; capitalPending: string; interest: string; loanName: string }>>([]);
  const [transactions, setTransactions] = useState<{
    transactions: Array<{
      id: number;
      date: string;
      concept: string;
      amount: string;
      category: string;
      type: string;
      source: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [dashRes, debtRes, txRes] = await Promise.all([
        api.dashboard(token, month),
        api.debtAmortization(token),
        api.transactions.list(token, { month, page }),
      ]);
      setDashboard(dashRes);
      setDebt(debtRes);
      setTransactions(txRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getToken, month, page]);

  useEffect(() => {
    load();
  }, [load]);

  const realVsBudget = dashboard?.realVsBudget ?? [];
  const debtData = debt.map((d) => ({
    date: d.date,
    capital: Number(d.capitalPending),
    name: d.loanName,
  }));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nil Finance</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Importar CSV
          </Button>
          <Button variant="ghost" onClick={load}>
            Actualizar
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex gap-4 items-center flex-wrap">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const v = d.toISOString().slice(0, 7);
                return (
                  <SelectItem key={v} value={v}>
                    {d.toLocaleDateString("es", { month: "long", year: "numeric" })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Gasto real vs Presupuesto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={realVsBudget} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="real" name="Gasto real" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="budget" name="Presupuesto" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolución de la deuda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {debtData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={debtData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="capital" name="Capital pendiente" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sin datos de amortización. Ejecuta el seed con tu Excel.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Movimientos</CardTitle>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {Array.from(new Set(transactions?.transactions?.map((t) => t.category) ?? [])).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transactions?.transactions ?? [])
                        .filter((t) => !categoryFilter || t.category === categoryFilter)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{t.date}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{t.concept}</TableCell>
                            <TableCell>{t.category}</TableCell>
                            <TableCell className="text-right font-mono">{t.amount} €</TableCell>
                            <TableCell>{t.type === "income" ? "Ingreso" : "Gasto"}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {transactions?.pagination && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {transactions.pagination.page} de {transactions.pagination.totalPages} ({transactions.pagination.total} movimientos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= (transactions.pagination.totalPages ?? 1)}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={load} />
    </div>
  );
}
