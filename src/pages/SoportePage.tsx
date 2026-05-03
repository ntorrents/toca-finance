import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SoportePage() {
  return (
    <Card className="max-w-2xl border-border/80 bg-card/50 shadow-none">
      <CardHeader>
        <CardTitle>Soporte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Para incidencias con importaciones, revisa que el Excel tenga columnas de fecha, concepto e importe (por
          ejemplo la pestaña «Extracto»).
        </p>
        <p>
          La aplicación guarda los <strong className="text-foreground">movimientos</strong> en PostgreSQL y un{" "}
          <strong className="text-foreground">historial de importaciones</strong> (nombre del archivo, fecha y
          resultado). Los ficheros originales no se conservan en el servidor.
        </p>
      </CardContent>
    </Card>
  );
}
