import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { ImportBudgetDialog } from "@/components/ImportBudgetDialog";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

type DashboardData = {
  month: string;
  realVsBudget: Array<{ category: string; real: number; budget: number }>;
  expenses: unknown[];
  budgets: unknown[];
};

type Transaction = {
  id: number;
  date: string;
  concept: string;
  amount: string;
  category: string;
  type: string;
  source: string;
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  Casa: ["Hogar", "Hipoteca", "Llum", "Aigua", "Gas", "Comunitat", "Manteniment", "IBI"],
  Transporte: ["Transporte", "Quota Cotxe", "Gasolina", "Tren", "Parking", "Manteniment"],
  Ocio: ["Ocio", "Entreteniment", "Menjar fora", "Cine", "Viatjar", "Esport", "Pasatemps", "VOD"],
  Personal: ["Personal", "Roba", "Peluqueria", "Colegiada", "Nespresso"],
  Salud: ["Salud", "Farmacia"],
  Alimentación: ["Alimentación", "Menjar"],
  Otros: [],
};

export function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [debt, setDebt] = useState<Array<{ date: string; capitalPending: string; interest: string; loanName: string }>>([]);
  const [transactions, setTransactions] = useState<{
    transactions: Transaction[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<string>("Casa");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [budgetImportOpen, setBudgetImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [dashRes, debtRes, txRes] = await Promise.all([
        api.dashboard(month),
        api.debtAmortization(),
        api.transactions.list({ month, page }),
      ]);
      const err = (dashRes as { error?: string })?.error ?? (debtRes as { error?: string })?.error ?? (txRes as { error?: string })?.error;
      if (err) {
        setApiError(err);
        setDashboard(null);
        setDebt([]);
        setTransactions(null);
      } else {
        setDashboard(dashRes as DashboardData);
        setDebt(debtRes as typeof debt);
        setTransactions(txRes as typeof transactions);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar datos";
      setApiError(msg);
      setDashboard(null);
      setDebt([]);
      setTransactions(null);
    } finally {
      setLoading(false);
    }
  }, [month, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const realVsBudget = dashboard?.realVsBudget ?? [];
  const debtData = debt.map((d) => ({
    date: d.date,
    capital: Number(d.capitalPending),
    name: d.loanName,
  }));

  // Agrupar por categoría grande
  const categoryGroups = Object.keys(CATEGORY_GROUPS);
  const transactionsByGroup = categoryGroups.reduce((acc, group) => {
    const categories = CATEGORY_GROUPS[group];
    const groupTransactions = (transactions?.transactions ?? []).filter((t) =>
      categories.some((cat) => t.category.toLowerCase().includes(cat.toLowerCase()))
    );
    acc[group] = groupTransactions;
    return acc;
  }, {} as Record<string, Transaction[]>);

  const selectedGroupTransactions = transactionsByGroup[selectedCategoryGroup] ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nil Finance</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBudgetImportOpen(true)}>
            Importar Presupuesto
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Importar Extracto
          </Button>
          <Button variant="ghost" onClick={load}>
            Actualizar
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Salir
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

        {apiError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
            {apiError}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="detalle">Detalle</TabsTrigger>
            <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Gasto real vs Presupuesto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full min-h-[300px]">
                      <ResponsiveContainer width="100%" height={300} minHeight={300}>
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
                    <div className="h-[280px] w-full min-h-[280px]">
                      {debtData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280} minHeight={280}>
                          <AreaChart data={debtData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="capital" name="Capital pendiente" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm">Sin datos de amortización.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="detalle" className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Movimientos</CardTitle>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
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
                          .filter((t) => categoryFilter === "__all__" || t.category === categoryFilter)
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
            )}
          </TabsContent>

          <TabsContent value="categoria" className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Filtrar por Categoría Grande</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedCategoryGroup} onValueChange={setSelectedCategoryGroup}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group} ({transactionsByGroup[group]?.length ?? 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Movimientos - {selectedCategoryGroup}</CardTitle>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedGroupTransactions.length > 0 ? (
                            selectedGroupTransactions.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.date}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{t.concept}</TableCell>
                                <TableCell>{t.category}</TableCell>
                                <TableCell className="text-right font-mono">{t.amount} €</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No hay movimientos en esta categoría
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={load} />
      <ImportBudgetDialog open={budgetImportOpen} onOpenChange={setBudgetImportOpen} onSuccess={load} />
    </div>
  );
}
