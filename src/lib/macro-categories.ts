/** Agrupación tipo referencia UI (pastillas / donut / análisis) */
export type MacroBucket = "necesidades" | "deseos" | "caprichos" | "mascotas" | "otros";

const MACRO_LABELS: Record<MacroBucket, string> = {
  necesidades: "Necesidades",
  deseos: "Deseos",
  caprichos: "Caprichos",
  mascotas: "Mascotas",
  otros: "Otros",
};

export function macroLabel(bucket: MacroBucket): string {
  return MACRO_LABELS[bucket];
}

export function macroColor(bucket: MacroBucket): string {
  switch (bucket) {
    case "necesidades":
      return "#34d399";
    case "deseos":
      return "#60a5fa";
    case "caprichos":
      return "#fbbf24";
    case "mascotas":
      return "#a78bfa";
    default:
      return "#94a3b8";
  }
}

/** Debe coincidir con la heurística en `api/analytics/index.ts` */
export function categoryToMacro(category: string): MacroBucket {
  const c = (category || "").toLowerCase();

  if (/mascota|perro|gato|veterinar|pet|pienso/i.test(c)) return "mascotas";

  if (
    /supermercado|farmacia|gasolina|internet|hipoteca|hogar|llum|aigua|gas|comunitat|ibi|parking|deloitte|c3linic|ahorro|tren|nomina|nómina|salud|impuesto|certificat|gestiones/i.test(
      c
    )
  )
    return "necesidades";

  if (/comida|bar|restaurant|cafeteria|sushi|ocio|netflix|vacaciones|cine|vod|viaje|viatjar|menjar fora/i.test(c))
    return "deseos";

  if (/regalo|multa|bizum|donatiu|ropa|compras casa|validar|peluqueria/i.test(c)) return "caprichos";

  return "otros";
}
