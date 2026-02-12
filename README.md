# Nil Finance

Dashboard financiero personal (gastos, presupuestos, evolución de deuda). React + Vite + TypeScript + Drizzle + Vercel.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://...

# Autenticación simple
ADMIN_EMAIL=tu@email.com
ADMIN_PASSWORD_HASH=sha256_hash_de_tu_contraseña
SESSION_SECRET=secreto_aleatorio_largo
```

**Para generar el hash de contraseña:**
```bash
node -e "console.log(require('crypto').createHash('sha256').update('tu_contraseña').digest('hex'))"
```

**Para generar SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Crear las tablas en la base de datos

```bash
npm run db:push
```

### 4. Ejecutar en desarrollo local

**IMPORTANTE**: Usa `vercel dev` para que las APIs funcionen:

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Ejecutar servidor de desarrollo
vercel dev
```

**NO uses `npm run dev`** porque Vite no sirve las funciones serverless de Vercel.

Abre http://localhost:3000 y haz login con tu email y contraseña.

---

## 📊 Uso

### Importar Plan de Gastos

1. Ve al Dashboard
2. Haz clic en **"Importar Presupuesto"**
3. Sube el archivo Excel "Plan de gastos.xlsx"
4. Debe tener una hoja llamada "0. Gastos global" con categorías e importes

### Importar Extracto Bancario

1. Haz clic en **"Importar Extracto"**
2. Sube un CSV o Excel del banco
3. **Formato esperado**: 
   - Cabecera en la **primera fila**
   - Datos desde la **segunda fila**
   - Columnas: fecha/date, concept/concepto, amount/importe

### Ver Datos

- **Dashboard**: Resumen con gráficos de gastos vs presupuesto y evolución de deuda
- **Detalle**: Lista completa de movimientos con filtros
- **Por Categoría**: Vista agrupada por categorías grandes (Casa, Transporte, Ocio, etc.)

---

## 🌐 Despliegue en Vercel

### 1. Conectar proyecto

Si aún no está conectado:
```bash
vercel
```

### 2. Configurar variables de entorno

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y añade:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

### 3. Desplegar

Haz push a GitHub y Vercel desplegará automáticamente, o ejecuta:
```bash
vercel --prod
```

### 4. Acceso

Una vez desplegado, podrás acceder desde cualquier dispositivo (móvil, tablet, etc.) usando la URL de tu proyecto Vercel.

---

## 🛠️ Comandos

- `vercel dev` - Servidor de desarrollo (con APIs)
- `npm run build` - Build para producción
- `npm run db:push` - Aplicar esquema a la base de datos
- `npm run db:generate` - Generar migraciones

---

## 📁 Estructura

- `/api` - Funciones serverless (Vercel)
- `/src` - Frontend React
- `/db` - Esquema y utilidades de base de datos

---

## ⚠️ Solución de Problemas

### "La API no devolvió JSON"

Esto ocurre si usas `npm run dev` en lugar de `vercel dev`. Las APIs solo funcionan con `vercel dev`.

### Error 401 (No autorizado)

- Verifica que tengas las variables de entorno configuradas
- Asegúrate de estar usando el email y contraseña correctos
- En producción, verifica que las variables estén en Vercel

### Error 500

- Verifica que las tablas existan: `npm run db:push`
- Verifica `DATABASE_URL` en las variables de entorno
- Revisa los logs en Vercel Dashboard → Functions
