# Academia PayGas

Plataforma LMS + gamificación para PayGas. Arquitectura monolito modular con despliegue flexible: desarrollo local con pnpm/vite, producción con Docker o Vercel/Cloudflare.

## Arquitectura

**Apps**
- `apps/web/` → SPA React 19 + Vite + Tailwind. Alias `@` y `@shared`. Servida estáticamente, proxy API a `apps/api`.
- `apps/api/` → Express 5 + TypeScript. **Drizzle ORM** DAL con failover multi-DB PG, dual-write, keep-alive. Middlewares: auth JWT, encryption AES, rate-limit, security headers.
- `apps/worker/` → Cloudflare Workers. Sirve assets y proxy `/api/*` a Vercel/API. No ejecuta Express nativamente.

**Packages**
- `packages/db/drizzle/pg/` → Esquemas Drizzle PG (`schema.ts`) y relaciones.
- `packages/db/prisma/` → Esquemas Prisma legacy (`schema.prisma` / `schema.mysql.prisma`), aún usados por migraciones y sync de infra.
- `packages/shared/` → Lógica CASL, quiz, tipos compartidos.

**Flujo de datos**
1. Usuario → Cloudflare Worker → asset estático o proxy API.
2. API → `apps/api/src/server/lib/drizzle-db.ts` DAL → registro `packages/db/drizzle/pg/schema.ts`.
3. Failover: PG primario → PG backup. DAL legacy en `apps/api/src/server/lib/_legacy/`.
4. Seguridad: JWT_SECRET/ENCRYPTION_KEY solo por env, CORS whitelist, CSP/HSTS.

```
apps/
  web/          # React Vite SPA
  api/          # Express + Prisma API
  worker/       # Cloudflare Workers
packages/
  db/prisma/    # Esquemas Prisma PG/MySQL + migraciones
  shared/       # Código compartido CASL/quiz
infra/
  docker/       # Dockerfile, compose, Makefile
```

## Requisitos

- Node 20+
- pnpm 9+
- PostgreSQL + MySQL opcional
- Variables en `.env`

## Desarrollo

```bash
corepack enable
pnpm install

cp .env.example .env
# editar .env

pnpm db:generate
pnpm db:migrate
pnpm db:seed

pnpm dev
```

Web: http://localhost:5173
API: http://localhost:3001/api/health

## Despliegue

### Opción 1: pnpm / Vite local
Ideal para desarrollo y preview rápido.
```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev            # desarrollo con HMR
```

**Build producción**
```bash
pnpm build          # genera dist/client y dist/server
NODE_ENV=production node dist/server/index.js
```
`pnpm build` ejecuta Prisma generate, Vite build y tsc para server.

### Opción 2: Docker
Recomendado para producción self-hosted/Koyeb.
```bash
docker compose up -d --build
docker compose logs -f app
docker compose down
```
Dockerfile multi-stage Alpine, usuario no-root, read-only, healthcheck en `/api/health`.

### Opción 3: Vercel + Cloudflare
- Web: Vite build desplegado en Vercel/Cloudflare Pages.
- API: Express compilado como Serverless Function vía `api/[...slug].js`.
- Worker: proxy `/api/*` a Vercel y sirve assets.
Variables requeridas: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_ORIGIN`.

### Opción 4: cPanel / Shared Hosting
Build de producción optimizado para cPanel:
```bash
pnpm cpanel:build
```
Genera `dist/client` y `dist/server` listos para subir vía FTP.
En cPanel:
1. Subir `dist/client` a `public_html/`
2. Subir `dist/server` a `public_html/api/` o directorio privado
3. Crear `.htaccess` para proxy `/api/` a `dist/server/index.js` vía Node Passenger o cron.
Scripts incluidos: `deploy.sh`, `start.sh`, `stop.sh`.
Variables: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, etc.

## Scripts útiles

- `pnpm test` → tests en `apps/api/tests`
- `pnpm lint` / `pnpm lint:fix`
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`
- `pnpm dev:worker` / `pnpm deploy:worker`

## Seguridad

- Secretos solo por variables de entorno. Sin fallback a disco.
- Security headers en `apps/api/src/server/index.ts`
- CORS whitelist desde `FRONTEND_ORIGIN`
- Table whitelist en DB sync

## CI

GitHub Actions en `.github/workflows/ci.yml` ejecuta audit, tests y lint.
