import { useState } from "react";
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

export function ImportBudgetDialog({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; categories?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecciona un archivo Excel.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.budgets.importFile(file);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ inserted: res.inserted ?? 0, categories: res.categories });
        setFile(null);
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
      setFile(null);
      setResult(null);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Plan de Gastos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Sube el archivo Excel "Plan de gastos.xlsx". Debe tener una hoja llamada "0. Gastos global"
            con las categorías e importes mensuales.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-secondary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Presupuestos importados: {result.inserted}</p>
              {result.categories && result.categories.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Ver categorías ({result.categories.length})</summary>
                  <ul className="list-disc list-inside mt-2 max-h-40 overflow-y-auto">
                    {result.categories.slice(0, 20).map((cat) => (
                      <li key={cat}>{cat}</li>
                    ))}
                    {result.categories.length > 20 && <li>... y {result.categories.length - 20} más</li>}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !file}>
            {loading ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
