import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ImportBudgetDialog } from "@/components/ImportBudgetDialog";
import { CloudUpload, FileSpreadsheet, Shield, Zap, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportLogRow = {
  id: number;
  fileName: string;
  status: string;
  inserted: number;
  skipped: number;
  errorMessage: string | null;
  createdAt: string;
};

export function ExtractosPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<ImportLogRow[]>([]);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    const res = (await api.importLogs(15)) as { logs?: ImportLogRow[] };
    setLogs(res.logs ?? []);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xls", "xlsx"].includes(ext)) {
      setMsg("Formato no admitido. Usa CSV o Excel.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = (await api.transactions.importFile(file)) as {
        error?: string;
        inserted?: number;
        skipped?: number;
      };
      if (res.error) setMsg(res.error);
      else
        setMsg(
          `Importación completada: ${res.inserted ?? 0} nuevos, ${res.skipped ?? 0} duplicados omitidos.`
        );
      await loadLogs();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    void handleFile(f ?? null);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Centro de extractos</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Sube extractos bancarios o de tarjeta en Excel o CSV. Los archivos se procesan en el servidor;{" "}
            <strong className="text-foreground">no guardamos el fichero</strong>, solo los movimientos en la base de
            datos y un registro de la importación.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors",
            dragOver ? "border-emerald-400/60 bg-emerald-500/5" : "border-border/60 bg-card/30"
          )}
        >
          <CloudUpload className="mb-4 size-12 text-emerald-400" />
          <p className="text-center text-sm font-medium">Arrastra y suelta tus archivos aquí</p>
          <p className="mt-2 max-w-md text-center text-xs text-muted-foreground">
            Formatos .xls, .xlsx y .csv. Soportado: libro «Gastos casa» (pestaña Extracto) y export del banco tipo{" "}
            <span className="text-foreground">Movimientos_Cuenta_… .xls</span> (Unicaja u hoja con columnas Fecha de
            operación, Concepto, Importe).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            disabled={loading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            className="mt-6 rounded-full bg-emerald-500 px-8 text-emerald-950 hover:bg-emerald-400"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            {loading ? "Procesando…" : "Explorar archivos"}
          </Button>
        </div>

        {msg && (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              msg.startsWith("Importación completada")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-amber-500/30 bg-amber-500/10 text-amber-100"
            )}
          >
            {msg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/80 bg-card/40 shadow-none">
            <CardHeader className="pb-2">
              <Shield className="mb-1 size-8 text-emerald-400/90" />
              <CardTitle className="text-sm">Subida segura</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              El archivo viaja cifrado (HTTPS) y no se almacena en disco.
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/40 shadow-none">
            <CardHeader className="pb-2">
              <Tag className="mb-1 size-8 text-sky-400/90" />
              <CardTitle className="text-sm">Etiquetado automático</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Reglas por concepto y columnas de categoría de tu Excel.
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/40 shadow-none">
            <CardHeader className="pb-2">
              <Zap className="mb-1 size-8 text-amber-400/90" />
              <CardTitle className="text-sm">Procesamiento rápido</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Miles de filas en segundos; duplicados ignorados automáticamente.
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 bg-card/40 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Presupuesto mensual</CardTitle>
            <CardDescription>
              Importa límites por categoría desde Excel para comparar con tus gastos reales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-border/80" onClick={() => setBudgetOpen(true)}>
              <FileSpreadsheet className="mr-2 size-4" />
              Importar presupuesto
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="border-border/80 bg-card/50 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cargas recientes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => loadLogs()}>
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay importaciones registradas.</p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 text-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <FileSpreadsheet className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{log.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("es-ES")}
                  </p>
                  {log.status === "completed" && (
                    <p className="mt-1 text-xs text-emerald-400">
                      Completado · +{log.inserted} · omitidos {log.skipped}
                    </p>
                  )}
                  {log.status === "failed" && (
                    <p className="mt-1 text-xs text-red-400">{log.errorMessage ?? "Fallido"}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    log.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                  )}
                >
                  {log.status === "completed" ? "OK" : "Err"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ImportBudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} onSuccess={loadLogs} />
    </div>
  );
}
