import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import type { MacroBucket } from "@/lib/macro-categories";
import { categoryToMacro, macroColor, macroLabel } from "@/lib/macro-categories";

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

function fmtLongDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

const MACRO_FILTERS: { key: MacroBucket | "todas"; label: string }[] = [
  { key: "todas", label: "Todos" },
  { key: "necesidades", label: "Necesidades" },
  { key: "deseos", label: "Deseos" },
  { key: "caprichos", label: "Caprichos" },
  { key: "mascotas", label: "Mascotas" },
  { key: "otros", label: "Otros" },
];

export function GastosPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [macro, setMacro] = useState<MacroBucket | "todas">("todas");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.transactions.list({
        month,
        limit: 500,
        page: 1,
      })) as { transactions?: Transaction[] };
      setRows(res.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (macro !== "todas" && categoryToMacro(t.category) !== macro) return false;
      if (!q) return true;
      return (
        t.concept.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [rows, macro, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [macro, search]);

  useEffect(() => {
    setPage(1);
  }, [month]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-10 w-full max-w-[240px] border-border/80 bg-card/40">
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
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar transacciones…"
            className="h-10 w-full rounded-lg border border-border/80 bg-card/40 py-2 pl-10 pr-4 text-sm outline-none ring-emerald-500/30 placeholder:text-muted-foreground focus:ring-2"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Filtrar por categoría
        </p>
        <div className="flex flex-wrap gap-2">
          {MACRO_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMacro(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                macro === key
                  ? "border-transparent bg-white/10 text-foreground ring-2 ring-emerald-500/40"
                  : "border-border/80 bg-card/30 text-muted-foreground hover:bg-card/50"
              }`}
              style={
                macro === key && key !== "todas"
                  ? { boxShadow: `inset 0 0 0 1px ${macroColor(key)}55` }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/40">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Descripción
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Categoría
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Importe
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((t) => {
                  const m = categoryToMacro(t.category);
                  return (
                    <TableRow key={t.id} className="border-border/50">
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {fmtLongDate(t.date)}
                      </TableCell>
                      <TableCell className="max-w-[280px] align-top">
                        <p className="font-medium leading-snug">{t.concept}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.category}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            background: `${macroColor(m)}22`,
                            color: macroColor(m),
                          }}
                        >
                          {macroLabel(m)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm tabular-nums ${
                          t.type === "income" ? "text-emerald-400" : ""
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatEur(Number(t.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No hay movimientos para este filtro.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {(pageSafe - 1) * pageSize + 1} a{" "}
                {Math.min(pageSafe * pageSize, filtered.length)} de {filtered.length} entradas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-border/80"
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border-border/80"
                >
                  →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
