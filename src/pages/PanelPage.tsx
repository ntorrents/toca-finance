import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { categoryToMacro, macroColor, macroLabel } from "@/lib/macro-categories";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";

type DashboardSummary = {
  totalExpenses: number;
  totalIncome: number;
  previousMonthExpenses: number;
  expenseMonthOverMonthPct: number | null;
  totalBudgetPlanned: number;
  budgetVariance: number;
};

type Transaction = {
  id: number;
  date: string;
  concept: string;
  amount: string;
  category: string;
  type: string;
};

const formatEur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function fmtDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
}

export function PanelPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevMonth, setPrevMonth] = useState<string | null>(null);
  const [spendLine, setSpendLine] = useState<{ month: string; totalExpenses: number }[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [dash, a, tx] = await Promise.all([
        api.dashboard(month) as Promise<{
          error?: string;
          summary?: DashboardSummary;
          previousMonth?: string;
        }>,
        api.analytics(month) as Promise<{
          error?: string;
          spendingByMonth?: { month: string; totalExpenses: number }[];
        }>,
        api.transactions.list({ page: 1, limit: 8 }) as Promise<{
          error?: string;
          transactions?: Transaction[];
        }>,
      ]);
      const e = dash?.error ?? a?.error ?? tx?.error;
      if (e) {
        setErr(e);
        return;
      }
      setSummary(dash.summary ?? null);
      setPrevMonth(dash.previousMonth ?? null);
      setSpendLine(a.spendingByMonth ?? []);
      setRecent(tx.transactions ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const mom = summary?.expenseMonthOverMonthPct;
  const momWorse = mom != null && mom > 0;
  const budgetUsed =
    summary && summary.totalBudgetPlanned > 0
      ? Math.min(100, (summary.totalExpenses / summary.totalBudgetPlanned) * 100)
      : 0;
  const budgetLeft =
    summary && summary.totalBudgetPlanned > 0
      ? Math.max(0, summary.totalBudgetPlanned - summary.totalExpenses)
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-10 w-[220px] border-border/80 bg-card/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const v = d.toISOString().slice(0, 7);
              return (
                <SelectItem key={v} value={v}>
                  {d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          asChild
          className="rounded-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
        >
          <Link to="/extractos">+ Subir extracto</Link>
        </Button>
      </div>

      {err && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {err}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total gastado
                </CardTitle>
                <Wallet className="size-5 text-emerald-400/80" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {formatEur(summary?.totalExpenses ?? 0)}
                </p>
                {mom != null && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-sm ${
                      momWorse ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {momWorse ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    {Math.abs(mom).toFixed(1)}% {momWorse ? "más" : "menos"} que el mes anterior
                    {prevMonth && (
                      <span className="text-muted-foreground">
                        · {formatEur(summary?.previousMonthExpenses ?? 0)} en {prevMonth}
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Presupuesto mensual
                </CardTitle>
                <PiggyBank className="size-5 text-sky-400/80" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatEur(summary?.totalBudgetPlanned ?? 0)}
                </p>
                {!!summary && summary.totalBudgetPlanned > 0 && (
                  <>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                        style={{ width: `${budgetUsed}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {budgetUsed.toFixed(0)}% usado · {formatEur(budgetLeft)} restantes
                    </p>
                  </>
                )}
                {(!summary || summary.totalBudgetPlanned <= 0) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Importa presupuestos desde{" "}
                    <Link to="/ajustes" className="text-emerald-400 underline-offset-4 hover:underline">
                      Ajustes
                    </Link>
                    .
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/50 shadow-none sm:col-span-2 xl:col-span-1">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ingresos del mes
                </CardTitle>
                <TrendingUp className="size-5 text-emerald-400/80" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums text-emerald-400/90">
                  {formatEur(summary?.totalIncome ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="border-border/80 bg-card/50 shadow-none lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Gasto por mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  {spendLine.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={spendLine} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}€`} />
                        <Tooltip
                          contentStyle={{
                            background: "#161b22",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                          }}
                          formatter={(v) => [formatEur(Number(v ?? 0)), "Gastos"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="totalExpenses"
                          stroke="rgb(52 211 153)"
                          fill="url(#spendFill)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin datos de gastos.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/50 shadow-none lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Actividad reciente</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-400" asChild>
                  <Link to="/gastos">Ver todo</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recent.length === 0 && (
                  <p className="text-sm text-muted-foreground">Importa un extracto para ver movimientos.</p>
                )}
                {recent.map((t) => {
                  const macro = categoryToMacro(t.category);
                  return (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.concept}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span
                            className="rounded-full px-2 py-0.5 font-medium"
                            style={{
                              background: `${macroColor(macro)}22`,
                              color: macroColor(macro),
                            }}
                          >
                            {macroLabel(macro)}
                          </span>
                          <span>{fmtDate(t.date)}</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-sm tabular-nums ${
                          t.type === "income" ? "text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatEur(Number(t.amount))}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
