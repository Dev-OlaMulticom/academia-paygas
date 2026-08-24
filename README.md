# Academia PayGas

Monorepo semántico con Web + API + Workers + DB.

## Estructura

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

## Producción

### Docker recomendado
```bash
docker compose up -d --build
docker compose logs -f app
docker compose down
```

### Node nativo
```bash
pnpm build
NODE_ENV=production node dist/server/index.js
```

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
