import { useCallback, useEffect, useMemo, useState } from "react";
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
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import type { MacroBucket } from "@/lib/macro-categories";
import { macroColor, macroLabel } from "@/lib/macro-categories";
import { Download, PiggyBank } from "lucide-react";

const formatEur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const MACROS: MacroBucket[] = ["necesidades", "deseos", "caprichos", "mascotas", "otros"];

export function AnalisisPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [byMacro, setByMacro] = useState<Record<string, number>>({});
  const [spendLine, setSpendLine] = useState<{ month: string; totalExpenses: number }[]>([]);
  const [savingsRate, setSavingsRate] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ macro: string; pctChange: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const a = (await api.analytics(month)) as {
        error?: string;
        byMacro?: Record<string, number>;
        spendingByMonth?: { month: string; totalExpenses: number }[];
        savingsRate?: number | null;
        alert?: { macro: string; pctChange: number } | null;
      };
      if (a.error) {
        setErr(a.error);
        return;
      }
      setByMacro(a.byMacro ?? {});
      setSpendLine(a.spendingByMonth ?? []);
      setSavingsRate(a.savingsRate ?? null);
      setAlert(a.alert ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const pieData = useMemo(() => {
    return MACROS.map((m) => ({
      name: macroLabel(m),
      key: m,
      value: byMacro[m] ?? 0,
    })).filter((d) => d.value > 0);
  }, [byMacro]);

  const totalDonut = useMemo(
    () => pieData.reduce((a, b) => a + b.value, 0),
    [pieData]
  );

  const largest = useMemo(() => {
    let best: { key: MacroBucket; v: number } | null = null;
    for (const m of MACROS) {
      const v = byMacro[m] ?? 0;
      if (!best || v > best.v) best = { key: m, v };
    }
    return best;
  }, [byMacro]);

  const lineLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleDateString("es-ES", { month: "short" });
  };

  const subtitleMonth = useMemo(() => {
    const [y, mo] = month.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Análisis de gastos</h2>
          <p className="text-sm text-muted-foreground">Perspectivas para {subtitleMonth}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-10 w-[200px] border-border/80 bg-card/40">
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
            variant="outline"
            size="sm"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            disabled
            title="Exportación próximamente"
          >
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/80 bg-card/50 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Desglose por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-[280px]">
                  {pieData.length > 0 && totalDonut > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={68}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {pieData.map((d) => (
                            <Cell key={d.key} fill={macroColor(d.key as MacroBucket)} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#161b22",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                          }}
                          formatter={(v) => formatEur(Number(v ?? 0))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Sin gastos este mes
                    </div>
                  )}
                  {pieData.length > 0 && totalDonut > 0 && (
                    <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
                      Total <span className="font-semibold text-foreground">{formatEur(totalDonut)}</span>
                    </p>
                  )}
                </div>
                <ul className="space-y-2 self-center">
                  {pieData.map((d) => {
                    const pct = totalDonut > 0 ? (d.value / totalDonut) * 100 : 0;
                    return (
                      <li key={d.key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ background: macroColor(d.key as MacroBucket) }}
                          />
                          {d.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/50 shadow-none">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                Alerta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alert ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    +{alert.pctChange}% {macroLabel(alert.macro as MacroBucket)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Has gastado un {alert.pctChange.toFixed(1)}% más en{" "}
                    <span className="text-foreground">{macroLabel(alert.macro as MacroBucket)}</span>{" "}
                    respecto al mes anterior.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin alertas destacadas este mes.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/50 shadow-none lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ritmo de gasto</CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spendLine.map((r) => ({ ...r, label: lineLabel(r.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}€`} />
                    <Tooltip
                      contentStyle={{
                        background: "#161b22",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                      }}
                      formatter={(v) => [formatEur(Number(v ?? 0)), "Gastos"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalExpenses"
                      stroke="#2dd4bf"
                      strokeWidth={2}
                      dot={{ fill: "#2dd4bf", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/50 shadow-none md:col-span-1">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categoría principal</CardTitle>
            </CardHeader>
            <CardContent>
              {largest && largest.v > 0 ? (
                <>
                  <p className="text-xl font-semibold">{macroLabel(largest.key)}</p>
                  <p className="mt-1 font-mono text-lg text-foreground/90">{formatEur(largest.v)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/50 shadow-none md:col-span-1">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de ahorro</CardTitle>
              <PiggyBank className="size-5 text-emerald-400/80" />
            </CardHeader>
            <CardContent>
              {savingsRate != null ? (
                <>
                  <p className="text-xl font-semibold text-emerald-400">{savingsRate.toFixed(1)}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {savingsRate >= 0 ? "En marcha respecto a ingresos del mes" : "Gastos superan ingresos"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sin ingresos registrados este mes</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
