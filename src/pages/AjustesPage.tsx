import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { ImportBudgetDialog } from "@/components/ImportBudgetDialog";

export function AjustesPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Ajustes</h2>
          <p className="text-sm text-muted-foreground">Presupuestos y preferencias básicas.</p>
        </div>
        <Card className="border-border/80 bg-card/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Presupuestos por categoría</CardTitle>
            <CardDescription>
              Define techos mensuales para comparar con el gasto real en el panel y en análisis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-border/80" onClick={() => setOpen(true)}>
              <FileSpreadsheet className="mr-2 size-4" />
              Importar desde Excel
            </Button>
          </CardContent>
        </Card>
      </div>
      <ImportBudgetDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
