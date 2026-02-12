# Plan de Simplificación - Nil Finance

## Objetivo
Aplicación simple para gestionar:
1. **Plan de gastos** (presupuesto mensual) - se sube una vez, luego se edita desde la web
2. **Extractos bancarios** - formato fijo, se suben mensualmente desde la web

## Problemas Actuales
- ❌ Seed complicado y confuso
- ❌ Errores 401 con Clerk (autenticación)
- ❌ Demasiada complejidad innecesaria

## Solución Propuesta

### 1. ELIMINAR el seed (`db/seed.ts`)
- **Razón**: No es necesario. Todo se importa desde la web.
- **Acción**: Borrar el archivo y el script `npm run db:seed`

### 2. ARREGLAR autenticación (Clerk)
- **Problema**: El token no se está enviando correctamente desde el frontend
- **Solución rápida**: Verificar que `getToken()` funciona y se pasa a las APIs
- **Alternativa si sigue fallando**: Simplificar a autenticación básica con sesión (sin Clerk)

### 3. FLUJO SIMPLIFICADO

#### A. Plan de Gastos (Presupuesto)
- **Subir Excel desde la web** → Botón "Importar Plan de Gastos"
- **Procesar**: Leer hoja "0. Gastos global", extraer categorías e importes
- **Guardar en DB**: Tabla `budgets`
- **Editar desde web**: Modificar presupuestos directamente en la UI
- **Exportar**: Botón para descargar como Excel/CSV

#### B. Extractos Bancarios
- **Subir Excel/CSV desde la web** → Botón "Importar Extracto"
- **Procesar**: Leer formato estándar (cabecera fila 10, datos desde fila 11)
- **Categorizar automáticamente**: Usar reglas de `categorize.ts`
- **Guardar en DB**: Tabla `transactions` (evitar duplicados por hash)
- **Ver en dashboard**: Comparar gastos reales vs presupuesto

### 4. AUTENTICACIÓN SIMPLIFICADA
- **Opción A (recomendada)**: Arreglar Clerk actual
  - Verificar variables de entorno (`CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`)
  - Asegurar que `getToken()` devuelve token válido
  - Deshabilitar registro público en Clerk Dashboard
  
- **Opción B (si Clerk sigue dando problemas)**: Autenticación básica
  - Usar sesión simple con cookie
  - Email/contraseña hardcodeado en `.env` (solo para desarrollo personal)
  - O usar NextAuth con credenciales simples

## Pasos de Implementación

### Paso 1: Arreglar autenticación (URGENTE)
1. Verificar variables `.env` de Clerk
2. Revisar que `getToken()` se llama correctamente en Dashboard
3. Añadir logs para debug del token
4. Probar que las APIs reciben el token

### Paso 2: Eliminar seed
1. Borrar `db/seed.ts`
2. Eliminar script `db:seed` de `package.json`
3. Documentar que todo se importa desde la web

### Paso 3: Mejorar importación desde web
1. Añadir botón "Importar Plan de Gastos" en Dashboard
2. Leer Excel con SheetJS (xlsx)
3. Procesar hoja "0. Gastos global" igual que el seed hacía
4. Guardar en `budgets` (borrar anteriores del usuario antes)

### Paso 4: Simplificar UI
1. Dashboard principal con:
   - Resumen del mes (gastos vs presupuesto)
   - Lista de transacciones
   - Gráficos simples
2. Botones claros:
   - "Importar Extracto Bancario"
   - "Importar Plan de Gastos"
   - "Editar Presupuestos"

## Archivos a Modificar

### Eliminar
- `db/seed.ts` ❌

### Modificar
- `src/pages/Dashboard.tsx` - Añadir importación de plan de gastos
- `api/lib/auth.ts` - Arreglar/verificar autenticación
- `api/budgets/index.ts` - Añadir endpoint POST para importar
- `src/components/ImportCsvDialog.tsx` - Extender para Excel de presupuestos

### Crear
- `api/budgets/import.ts` - Endpoint para importar plan de gastos desde Excel
- `src/components/ImportBudgetDialog.tsx` - Componente para subir plan de gastos

## Variables de Entorno Necesarias

```env
# Base de datos
DATABASE_URL=...

# Clerk (si mantenemos)
CLERK_SECRET_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...

# O autenticación simple (alternativa)
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD_HASH=...
```

## Prioridades

1. 🔴 **URGENTE**: Arreglar 401 (autenticación)
2. 🟡 **IMPORTANTE**: Eliminar seed, añadir importación desde web
3. 🟢 **MEJORA**: Simplificar UI y flujo
