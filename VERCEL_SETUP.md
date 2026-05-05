# Configuración para Vercel

## Desarrollo Local

Tienes **dos formas** (elige una):

### A) Solo Vercel (recomendado)

```bash
vercel dev
```

Abre la URL que imprime la CLI (suele ser `http://localhost:3000`). Ahí el frontend y `/api/*` van juntos.

### B) Vite (5173) + API en paralelo

1. Terminal 1 — API + entorno Vercel (deja este proceso en marcha):

```bash
vercel dev
```

(Por defecto escucha en el puerto **3000**, que es el que usa el proxy de Vite.)

2. Terminal 2 — interfaz con HMR; las peticiones a `/api` se proxifican al puerto 3000:

```bash
npm run dev
```

Abre `http://localhost:5173`.

Si no tienes la CLI:

```bash
npm i -g vercel
```

## Variables de Entorno en Vercel

Cuando despliegues en Vercel, necesitas añadir estas variables en **Project Settings → Environment Variables**:

### Obligatorias:
- `DATABASE_URL` - URL de conexión a tu base de datos Neon/Postgres
- `ADMIN_EMAIL` - Tu email para login
- `ADMIN_PASSWORD_HASH` - Hash SHA256 de tu contraseña
- `SESSION_SECRET` - Secreto aleatorio para las sesiones

### Para generar el hash de contraseña:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('tu_contraseña').digest('hex'))"
```

### Para generar SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Despliegue

1. **Push a GitHub**: Haz commit y push de todos los cambios
2. **Vercel detecta automáticamente**: Si tienes el proyecto conectado, Vercel desplegará automáticamente
3. **Añade variables de entorno**: Ve a tu proyecto en Vercel → Settings → Environment Variables y añade las variables de arriba
4. **Redeploy**: Si ya estaba desplegado, haz un nuevo deploy después de añadir las variables

## Acceso desde Móvil

Sí, una vez desplegado en Vercel, podrás acceder desde cualquier dispositivo (móvil, tablet, etc.) usando la URL de tu proyecto Vercel (ej: `tu-proyecto.vercel.app`).

La aplicación es responsive y funcionará en móviles.

## Estructura de APIs

Las rutas API están en `/api` y Vercel las detecta automáticamente:
- `/api/dashboard` → GET
- `/api/budgets` → GET
- `/api/budgets/import` → POST
- `/api/transactions` → GET
- `/api/transactions/import` → POST
- `/api/debt-amortization` → GET
- `/api/auth/login` → POST
- `/api/auth/logout` → POST
- `/api/auth/check` → GET
