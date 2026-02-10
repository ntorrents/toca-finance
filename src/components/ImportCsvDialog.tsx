import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void };

export function ImportCsvDialog({ open, onOpenChange, onSuccess }: Props) {
  const { getToken } = useAuth();
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file, "UTF-8");
  };

  const handleSubmit = async () => {
    if (!csv.trim()) {
      setError("Pega el contenido CSV o sube un archivo.");
      return;
    }
    const token = await getToken();
    if (!token) {
      setError("No hay sesión.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.transactions.importCsv(token, { csv: csv.trim() });
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ inserted: res.inserted ?? 0, skipped: res.skipped ?? 0 });
        setCsv("");
        onSuccess?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCsv("");
      setResult(null);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar movimientos (CSV banco)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Sube un CSV o pega su contenido. Columnas esperadas: fecha/date, concept/concepto, amount/importe, category/categoría, type (income/expense).
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-secondary"
          />
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Pega aquí el CSV..."
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <p className="text-sm text-muted-foreground">
              Insertados: {result.inserted}, omitidos (duplicados): {result.skipped}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
