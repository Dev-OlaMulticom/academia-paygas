# Guía de Despliegue — Vercel + Cloudflare Workers

Esta guía cubre el despliegue **serverless/edge**, alternativo a cPanel
([DEPLOY-CPANEL.md](DEPLOY-CPANEL.md)). Arquitectura:

```
Usuario
  │
  ▼
Cloudflare Worker (edge, dominio principal)
  ├── /*        → sirve el SPA (dist/client) como Static Assets
  └── /api/*    → proxy transparente ──► Vercel (Express serverless)
                                            │
                                            ▼
                                     Postgres (Neon)
```

**Por qué esta combinación y no dos backends independientes:** el backend
Express (`server/`) concentra lógica sensible — auth JWT, bcrypt, permisos
CASL, rate limiting, cifrado AES-256-GCM. Reimplementarlo nativamente en
Hono/Workers significaría mantener dos copias de ese código en dos runtimes
distintos (con alto riesgo de que diverjan y uno quede inseguro — de hecho
`worker/api.ts`, ya eliminado, tenía un login que aceptaba cualquier
contraseña). En su lugar:

- **Vercel** aloja el único backend real (Express empaquetado como función
  serverless vía `api/[...slug].js`).
- **Cloudflare Worker** sirve el SPA compilado (`dist/client`) desde el edge
  y reenvía `/api/*` a Vercel (`worker/index.ts`). Desde el navegador, las
  llamadas a `/api/*` son same-origin (sin problemas de CORS).

Si en el futuro se necesita que la API corra nativamente en Workers, hay que
portar cada ruta de `server/routes/` a Hono, validar que `bcryptjs`/
`jsonwebtoken` funcionen bajo `nodejs_compat`, y configurar un binding
Hyperdrive para Postgres — es un trabajo grande, fuera del alcance de esta
guía.

---

## 1. Base de datos: Neon Postgres

1. Crear un proyecto en [neon.tech](https://neon.tech) (o usar uno existente).
2. Copiar dos connection strings del branch `main`:
   - **Pooled** (host termina en `-pooler`) → `PG_URL_1` / `DATABASE_URL`.
   - **Direct** (sin `-pooler`) → `DIRECT_URL` (solo para migraciones).
3. **No** configurar `PG_URL_2`, `PG_URL_3` ni `MYSQL_URL` en este entorno —
   el failover multi-DB y el dual-write están pensados para el proceso
   persistente de cPanel; en serverless solo añaden latencia por request sin
   beneficio (no hay un segundo proceso vivo al que hacer failover).
4. Aplicar el esquema:
   ```bash
   DIRECT_URL="postgres://...sin-pooler.../db?sslmode=require" \
     npx prisma migrate deploy
   ```
5. (Opcional) Seed inicial: `pnpm db:seed` apuntando a `DATABASE_URL`.

Ver `.env.example` para el detalle de cada variable.

---

## 2. Backend + SPA en Vercel

1. Importar el repo en Vercel (framework preset: **Other** — ya hay
   `vercel.json` con `framework: null`).
2. Variables de entorno (Project Settings → Environment Variables):
   - `DATABASE_URL` / `PG_URL_1` (pooled de Neon)
   - `DIRECT_URL` (solo se usa en build si corres migraciones desde el CI de Vercel)
   - `JWT_SECRET` (≥32 caracteres, generar con `openssl rand -hex 32`)
   - `ENCRYPTION_KEY` (ídem)
   - `ALLOWED_ORIGINS` (incluir el dominio de Cloudflare y el de Vercel)
   - `APP_URL`, `SMTP_*`, `PAYGAS_API_*` según `.env.example`
   - **Importante:** `JWT_SECRET`/`ENCRYPTION_KEY` deben fijarse explícitamente
     — el fallback que auto-genera y persiste en disco (`.jwt-secret`) no
     funciona en funciones serverless (filesystem efímero/solo lectura, sin
     estado compartido entre invocaciones ni cold starts).
3. Build command / output ya configurados en `vercel.json`:
   - `buildCommand`: `npx prisma generate && npx vite build && npx tsc --project tsconfig.server.json`
   - `outputDirectory`: `dist/client`
   - Función `api/[...slug].js`: `maxDuration: 30s`, `memory: 1024MB`,
     `includeFiles: dist/server/**` (necesario porque requiere el server
     compilado con una ruta dinámica que el tracer de Vercel no detecta solo).
4. Deploy. Verificar:
   ```bash
   curl https://<tu-proyecto>.vercel.app/api/health
   ```

**Límites del plan:** en el plan Hobby, `maxDuration` está topado a 10s
(el valor de 30s en `vercel.json` requiere plan Pro o superior). Bajar el
valor si te quedas en Hobby.

---

## 3. Frontend (edge) en Cloudflare Workers

1. Instalar Wrangler si hace falta: `pnpm add -D wrangler` (ya está en
   `devDependencies`).
2. Compilar el SPA: `pnpm cf:build` (solo `vite build`, sin Prisma — el
   Worker no toca la base de datos directamente).
3. Configurar `API_ORIGIN` con la URL del deployment de Vercel:
   ```bash
   npx wrangler secret put API_ORIGIN
   # o editar el valor por defecto en wrangler.toml [vars]
   ```
4. Deploy:
   ```bash
   pnpm deploy:worker   # = npx wrangler deploy
   ```
   Wrangler will warn that multiple environments are defined (`[env.staging]`
   in `wrangler.toml`) and no target was specified. To deploy the top-level
   (production) environment explicitly: `npx wrangler deploy --env ""`. To
   deploy staging: `npx wrangler deploy --env staging`.
5. Verificar:
   ```bash
   curl https://<tu-worker>.workers.dev/api/health   # debe responder igual que Vercel
   curl https://<tu-worker>.workers.dev/              # debe servir el SPA (index.html)
   ```

### Dominio propio

Configura una ruta/dominio personalizado en Cloudflare (Workers → Triggers →
Custom Domains) apuntando al Worker, y agrega ese dominio a `ALLOWED_ORIGINS`
en Vercel (por si algún cliente llama a la API directamente sin pasar por el
proxy, p. ej. en desarrollo).

---

## 4. Diferencias clave vs. cPanel

| Aspecto | cPanel (proceso persistente) | Vercel + Cloudflare (serverless) |
|---|---|---|
| Keep-alive / health-check / sync en background | Corren con `setInterval` mientras el proceso vive | No aplican — cada invocación de función es efímera. El código ya los omite automáticamente (`require.main === module` es falso cuando `api/[...slug].js` importa el server compilado), así que no requieren cambios. |
| Multi-DB failover (PG_URL_2, MySQL) | Soportado y recomendado | No configurar — una sola Postgres (Neon) pooled |
| `JWT_SECRET`/`ENCRYPTION_KEY` autogenerados | Persisten en `.jwt-secret` en disco | Deben fijarse por variable de entorno |
| Conexión a Postgres | TCP directo | TCP vía el pooler de Neon (PgBouncer) — obligatorio para no agotar conexiones |

---

## 5. Troubleshooting

- **`/api/*` en Cloudflare devuelve 500 `config_error`**: falta `API_ORIGIN`
  en el Worker (var o secret).
- **Errores `too many connections` en Neon**: confirma que `PG_URL_1`/
  `DATABASE_URL` usan el host `-pooler`, no el directo.
- **`prisma migrate deploy` cuelga o falla con timeout**: usa `DIRECT_URL`
  (no pooled) para migraciones — `prisma.config.ts` ya lo hace automáticamente
  cuando detecta `migrate`/`push` en los argumentos.
- **Login falla en producción pero funciona en local**: revisa que
  `JWT_SECRET` y `ENCRYPTION_KEY` estén configurados igual en todas las
  variables de entorno de Vercel (Production/Preview/Development pueden
  diferir).
