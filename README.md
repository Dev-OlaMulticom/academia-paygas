# Academia PayGas

Plataforma LMS + gamificación para PayGas. Arquitectura monolito modular con despliegue flexible: desarrollo local con Bun/Vite, producción con Docker o Vercel/Cloudflare.

## Arquitectura

**Apps**
- `apps/web/` → SPA React 19 + Vite + Tailwind. Alias `@` y `@shared`. Servida estáticamente, proxy API a `apps/api`.
- `apps/api/` → Fastify 5 + TypeScript. **Drizzle ORM** DAL con failover multi-DB PG, dual-write, keep-alive. Plugins: auth JWT, encryption AES, rate-limit, security headers.
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
  api/          # API Fastify (DAL Drizzle)
  worker/       # Cloudflare Workers
packages/
  db/prisma/    # Esquemas Prisma PG/MySQL + migraciones
  shared/       # Código compartido CASL/quiz
infra/
  docker/       # Dockerfile, compose, Makefile
```

## Requisitos

- Node 22+ (runtime de producción)
- Bun 1.4+ (toolchain: install, dev, test, build)
- PostgreSQL + MySQL opcional
- Variables en `.env`

## Desarrollo

```bash
bun install

cp .env.example .env
# editar .env

bun run db:generate
bun run db:migrate
bun run db:seed

bun run dev
```

Web: http://localhost:5173
API: http://localhost:3001/api/health

## Despliegue

### Opción 1: Bun / Vite local
Ideal para desarrollo y preview rápido.
```bash
bun install
cp .env.example .env
bun run db:generate && bun run db:migrate && bun run db:seed
bun run dev         # desarrollo con HMR (Vite :5173 + API :3001)
```

**Build producción**
```bash
bun run build       # genera dist/client (Vite) y dist/server (tsc)
NODE_ENV=production node dist/server/index.js
```
El bundle que usa producción se genera con `bun run build:server` (esbuild → `dist/server/index.js`).

### Opción 2: Docker
Recomendado para producción self-hosted/Koyeb.
```bash
docker compose up -d --build
docker compose logs -f app
docker compose down
```
Dockerfile multi-stage Alpine, usuario no-root, read-only, healthcheck en `/api/health`.

**Servidor pequeño (0.1 vCPU / 256 MB): no compilar ahí.** CI publica la imagen en GHCR en cada push a `main`; en el servidor solo se pullea:

```bash
# una sola vez: login con un PAT con read:packages
echo "$GHCR_TOKEN" | docker login ghcr.io -u USUARIO --password-stdin

# cada deploy
make pull          # docker compose pull && docker compose up -d
```
El compose ya trae límites `mem 256m` / `cpus 0.1` y el perfil tiny (`PG_POOL_SIZE`, `FULL_SYNC_OFF`, etc.).

### Opción 3: Vercel + Cloudflare
- Web: Vite build desplegado en Vercel/Cloudflare Pages.
- API: compilado como Serverless Function vía `api/[...slug].js`.
- Worker: proxy `/api/*` a Vercel y sirve assets.
Variables requeridas: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_ORIGIN`.

### Opción 4: VPS bare-metal
Para un VPS propio detrás de nginx/apache (sin Passenger):
```bash
./deploy.sh         # install + build + migrate + restart con healthcheck
```
Scripts incluidos: `deploy.sh`, `start.sh`, `stop.sh` (corren `node dist/server/index.js` con nohup + PID file).
Variables: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, etc.

## Scripts útiles

- `bun test` → suite completa en `tests/`
- `bun run lint` / `bun run lint:fix`
- `bun run db:generate`, `bun run db:migrate`, `bun run db:seed`
- `bun run dev:worker` / `bun run deploy:worker`

## Seguridad

- Secretos solo por variables de entorno. Sin fallback a disco.
- Security headers en `apps/api/src/server/fastify.ts`
- CORS whitelist desde `FRONTEND_ORIGIN`
- Table whitelist en DB sync

## CI

GitHub Actions en `.github/workflows/ci.yml` ejecuta audit, tests y lint.
