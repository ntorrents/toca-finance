/**
 * Asigna categoría a un movimiento según el texto del concepto.
 * Reglas ampliables: añade entradas a RULES (orden importa: primera coincidencia gana).
 */
const RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /NOMINA|NÓMINA|NOMINA|SALARIO|Nómina/i, category: "Nómina" },
  { pattern: /FARMACIA|FARM\.|PARAFARMACIA/i, category: "Salud" },
  { pattern: /COMPRA TARJ\.|TARJETA|PAGO TARJETA|PAGO TARJ/i, category: "Compras" },
  { pattern: /DEVOLUCION TAR\.|DEVOLUCION|ANUL COMPRA|ANULACION/i, category: "Compras" },
  { pattern: /TRANSFERENCIA A|TRANSFERENCIA ENVIADA|TRANSF\. ENVIADA/i, category: "Transferencias" },
  { pattern: /TRANSFERENCIA DE|TRANSFERENCIA RECIBIDA|TRANSF\. RECIBIDA/i, category: "Ingresos" },
  { pattern: /REINTEGRO|CAJERO|ATM|EFECTIVO/i, category: "Efectivo" },
  { pattern: /PRESTAMOS ADEUDO|HIPOTECA|PRÉSTAMO|PRESTAMO|CUOTA COCHE|FINANCIACIÓN|ADEUDO/i, category: "Préstamos" },
  { pattern: /SEGURO|ASEGURADORA|SEGURO MG/i, category: "Seguros" },
  { pattern: /LUZ|ELECTRICIDAD|ENDESA|IBERDROLA|NATURGY|LLUM/i, category: "Hogar" },
  { pattern: /AGUA|GAS|COMUNIDAD|COMUNITAT|RECIBO/i, category: "Hogar" },
  { pattern: /SUPERMERCADO|MERCADONA|CARREFOUR|LIDL|ALDI|CONSUM/i, category: "Alimentación" },
  { pattern: /RESTAURANTE|BAR|CAFE|COMIDA|DELIVERY|GLOVO|UBER EATS|MENJAR FORA/i, category: "Restauración" },
  { pattern: /GASOLINA|GASÓLEO|REPOSTAR|REPSOL|CEPSA|BP/i, category: "Transporte" },
  { pattern: /NETFLIX|SPOTIFY|AMAZON PRIME|HBO|SUBSCRIPTION|VOD/i, category: "Ocio" },
  { pattern: /TELEFONO|MÓVIL|MOVIL|VODAFONE|ORANGE|MOVISTAR|INTERNET/i, category: "Telecomunicaciones" },
  { pattern: /GIMNASIO|DEPORTE|ESPORT/i, category: "Deporte" },
  { pattern: /HOTEL|GOLDEN HOTELES|ALOJAMIENTO|VIATJAR/i, category: "Viajes" },
];

const DEFAULT_CATEGORY = "Otros";

export function categorizeFromConcept(concept: string): string {
  const trimmed = (concept || "").trim();
  if (!trimmed) return DEFAULT_CATEGORY;
  for (const { pattern, category } of RULES) {
    if (pattern.test(trimmed)) return category;
  }
  return DEFAULT_CATEGORY;
}
