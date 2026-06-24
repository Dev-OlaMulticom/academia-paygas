# AGENTS.md — Academia PayGas

Corporate LMS for PayGas gas station employees. React SPA + Express API + PostgreSQL.

## Commands

```bash
# Dev (both frontend + backend concurrently)
pnpm dev

# Dev individual
pnpm dev:client          # Vite on :5173
pnpm dev:server          # tsx watch server/index.ts on :3001

# Build (required before deploy or start)
pnpm build               # prisma generate + vite build + tsc server

# Build individual
npx vite build            # frontend only
npx tsc --project tsconfig.server.json  # server only

# Start (production, requires build first)
pnpm start               # node dist/server/index.js

# Lint
pnpm lint                # eslint .

# Database
npx prisma generate      # generate client
npx prisma migrate deploy
pnpm db:seed             # tsx prisma/seed.ts (test users)
pnpm db:reset            # reset + seed

# Deploy (cPanel/production)
./deploy.sh              # auto-detects nginx, compiles, restarts
```

No typecheck or test commands exist. No test framework is configured.

## Pre-flight Checks

Before starting development or running commands, verify:

1. **pnpm installed**: Run `pnpm --version` — if not found, install with `npm install -g pnpm`
2. **Dependencies installed**: Run `pnpm install` in project root
3. **.env file exists**: Copy `.env.example` to `.env` if missing, configure required vars

## Architecture

**Single package** — not a monorepo. Two compilation targets:

- `src/` → frontend (Vite, React 19, outputs to `dist/`)
- `server/` → backend (TSC, Express 5, outputs to `dist/server/`)

Backend entry: `server/index.ts` (Express on port 3001).
Frontend entry: `src/main.tsx` → `src/App.tsx` (React Router, BrowserRouter).

### Path aliases

- `@/*` → `./src/*` (frontend, via tsconfig.json + vite.config.ts)

### Two tsconfigs

| Config | Scope | Module | Notes |
|--------|-------|--------|-------|
| `tsconfig.json` | `src/` (frontend) | ESNext/bundler | `noEmit: true`, excludes `server/` |
| `tsconfig.server.json` | `server/` | CommonJS/node | Outputs to `dist/server/` |

ESLint uses the appropriate tsconfig per file group (configured in `eslint.config.js`).

### UI stack

shadcn/ui (new-york style), Radix UI primitives, TailwindCSS 4, Lucide icons. Components live in `src/components/ui/`. Config in `components.json`.

### Backend routes

All under `/api/`. Key route files in `server/routes/`:
`auth`, `usuarios`, `cms`, `certificates`, `notifications`, `progresso`, `dashboard`, `analytics`, `forum`, `gamification`, `public`, `modules`, `conquistas`.

### Database

Prisma 7 + PostgreSQL. Schema: `prisma/schema.prisma`. Seed: `prisma/seed.ts`.

**Naming gotcha:** The DB table is `Modulo` but the frontend/CMS calls it "Curso". The field `moduloId` is `cursoId` in frontend context. This is cosmetic only — the schema is not changing.

### Encryption

AES-256-GCM payloads between client and server. Client fetches key from `GET /api/config` before login. See `src/lib/crypto.ts` (client) and `server/middleware/encryption.ts` (server).

### Auth

JWT + bcryptjs. Three roles: `ADMIN`, `GESTOR`, `ATENDENTE`. GESTOR is restricted to their own team members. Tokens verified via `server/middleware/auth.ts`.

### Gamification / XP

XP points are configurable via the `XPConfig` table (editable by ADMIN at `/xp-config`). Values are decimals (Float). The `awardPoints` function in `server/services/gamification.ts` reads config from DB with a 60s in-memory cache, falling back to hardcoded defaults.

Default XP values:

| Action | Points | Trigger |
|--------|--------|---------|
| `LOGIN` | 0.05 | Each login (max 1/day per user) |
| `MODULE_OPEN` | 0.05 | First time opening a module |
| `LESSON_VIEW` | 0.1 | Viewing a lesson/aula |
| `LESSON_COMPLETE` | 1.0 | Completing a lesson/aula |
| `MODULE_COMPLETE` | 5.0 | Completing all aulas in a module |
| `QUIZ_CORRECT` | 0.5 | Each correct quiz answer |
| `QUIZ_PASS` | 2.0 | Passing a quiz (nota >= notaMinima) |
| `CERTIFICATE` | 10.0 | Obtaining a certificate |

Level = `Math.floor(xp / 2000) + 1`. `awardPointsIfNotAwarded` deduplicates by (userId, action, details-as-dedupKey). `awardLoginPointsDaily` limits login XP to once per calendar day.

### Activity Logs

All user actions are logged to the `ActivityLog` table via the shared `logActivity(userId, acao, detalhes)` service (`server/services/log.ts`). ADMIN can view logs at `/logs` with filters by user, action type, and date range.

## Environment

Copy `.env.example` to `.env`. Key vars:

- `DATABASE_URL` — required, PostgreSQL connection string
- `JWT_SECRET` — optional, auto-generated if weak/missing
- `ENCRYPTION_KEY` — optional, auto-generated if missing
- `ALLOWED_ORIGINS` — required, comma-separated CORS origins
- `SMTP_*` — optional, for email notifications

## Conventions

- **Commit format:** `tipo: descripcion` — types: feat, fix, security, docs, chore, deploy
- **Language:** UI strings are in Portuguese (pt-BR). Code identifiers also use Portuguese naming (`modulo`, `aula`, `licao`, `equipe`, `certificados`).
- **No test framework.** Verification is manual via API health check and seed data.
- **Deploy target:** cPanel with nginx reverse proxy. `deploy.sh` handles nginx snippet creation, build, and restart. Production runs `node dist/server/index.js` directly (not Passenger).

## Gotchas

- `pnpm build` must run `prisma generate` before vite/tsc — the build script chains this automatically.
- `.htaccess` does nothing on nginx (production server). The nginx snippet in `deploy.sh` replaces its functionality.
- Vite dev server proxies `/api` to `https://localhost:3001` (note: `secure: false` for self-signed certs).
- `app.js` and `Passengerfile.json` exist for Phusion Passenger but are NOT used by `deploy.sh`.
- No `typecheck` command — run `npx tsc --noEmit` for frontend or check server with `npx tsc --project tsconfig.server.json --noEmit` if needed.
- Prisma migrations live in `prisma/migrations/`. Use `prisma migrate dev` to create new ones locally.
