# AGENTS.md — Academia PayGas

Corporate LMS for PayGas gas station employees. React SPA + Express API + PostgreSQL (primary) + MySQL (backup).

## Commands

```bash
# Dev (both frontend + backend concurrently)
pnpm dev

# Dev individual
pnpm dev:client          # Vite on :5173
pnpm dev:server          # tsx watch server/index.ts on :3001

# Build (required before deploy or start)
pnpm build               # prisma generate (PG+MySQL) + vite build + tsc server

# Build individual
npx vite build            # frontend only
npx tsc --project tsconfig.server.json  # server only

# Start (production, requires build first)
pnpm start               # node dist/server/index.js

# Lint
pnpm lint                # eslint .

# Database - PostgreSQL (primary)
npx prisma generate      # generate PG client
npx prisma migrate deploy
pnpm db:seed             # tsx prisma/seed.ts (test users)
pnpm db:reset            # reset + seed

# Database - MySQL (backup)
npx prisma generate --schema=prisma/schema.mysql.prisma  # generate MySQL client
pnpm db:generate:mysql   # same as above
pnpm db:sync-mysql       # initial sync PG → MySQL (runs pg-dump + mysql import)

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

All under `/api/`. Route files in `server/routes/`:
`auth`, `usuarios`, `cms`, `certificates`, `notifications`, `progresso`, `dashboard`, `docs`, `analytics`, `forum`, `gamification`, `conquistas`, `public`, `modules`, `logs`, `xpconfig`, `import-export`, `adminDashboard`.

### Database

**Multi-database architecture with failover**: Reads failover to next healthy database. Writes go to all healthy databases in parallel. Background sync reconciles empty databases when they recover.

- **PG_URL_1**: Primary PostgreSQL (Supabase). All reads + writes.
- **PG_URL_2**: Backup PostgreSQL (Nhost). Failover for reads. Writes are best-effort.
- **DATABASE_URL**: Legacy fallback (used if PG_URL_1 not set).
- **MYSQL_URL**: Backup/redundancy (third-tier, different engine).
- **Health checks**: Every 60s, monitors all databases. Exponential backoff for disconnected ones.
- **Keep-alive**: Pings all databases every 12h to prevent free-tier pauses.
- **Background sync**: When a completely empty database recovers, syncs all data from healthiest database. Does NOT sync stale (non-empty) databases.

```env
# .env — Multi-PG configuration
PG_URL_1="postgres://...@supabase.co:5432/postgres?sslmode=require"   # Primary
PG_URL_2="postgres://...@nhost.run:5432/project?sslmode=require"     # Backup
DATABASE_URL="..."  # Legacy fallback (if PG_URL_1 not set)
MYSQL_URL="..."     # MySQL backup (different engine)
```

**Naming gotcha:** The DB table is `Modulo` but the frontend/CMS calls it "Curso". The field `moduloId` is `cursoId` in frontend context. This is cosmetic only — the schema is not changing.

### Data Access Layer (DAL)

All database access goes through `server/lib/db.ts`. Never call `prisma.*` directly in routes.

```ts
import { db } from '../lib/db'

// CRUD operations (dual-write to Nhost + MySQL)
await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.upsert('progresso', { ... }, { ... }, { ... })
await db.delete('user', { id: '123' })

// Reads always use primary (PG_URL_1)
await db.findMany('modulo', { where: { ativo: true } })
```

Models are configured in `server/lib/db-models.ts`. Each model maps PG, Nhost, and MySQL delegates. Nhost and MySQL are `null` when their URL env vars are not set — dual-write gracefully degrades.

**Gotcha:** `db.transaction()` only uses the primary Prisma client — no replication to backups. Raw queries (`db.queryRaw()`) also only hit primary.

### Encryption

AES-256-GCM payloads between client and server. Client fetches key from `GET /api/config` before login. See `src/lib/crypto.ts` (client) and `server/middleware/encryption.ts` (server).

### Email Service

Centralized email dispatch via `server/services/email.ts`. Primary: Gmail SMTP. Backup: Resend SMTP. Auto-fallback on failure. Every email BCCs `email@academia.paygas.com.br`. `sendEmail()` returns `{ success, messageId, error }`.

### Auth & Authorization

**Authentication**: JWT + bcryptjs. Three roles: `ADMIN`, `GESTOR`, `ATENDENTE`. GESTOR is restricted to their own team members. Tokens verified via `server/middleware/auth.ts`.

**Authorization**: CASL-based RBAC/ABAC. All permission logic centralized in `server/auth/casl/`.

**Middleware** (`server/middleware/auth.ts`) supports both patterns:
```ts
// Role-based (backward compat)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred for new code)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User'), handler)
```

**Frontend permissions** (`src/hooks/useAbility.ts`):
```tsx
const { can, cannot, isAdmin, isGestor } = useAbility()
if (can('delete', 'User')) { /* show delete button */ }
```

### Gamification / XP

XP points are configurable via the `XPConfig` table (editable by ADMIN at `/xp-config`). Values are decimals (Float). The `awardPoints` function in `server/services/gamification.ts` reads config from DB with a 60s in-memory cache, falling back to hardcoded defaults.

Level = `Math.floor(xp / 2000) + 1`. `awardPointsIfNotAwarded` deduplicates by (userId, action, details-as-dedupKey). `awardLoginPointsDaily` limits login XP to once per calendar day.

### Activity Logs

All user actions are logged to the `ActivityLog` table via the shared `logActivity(userId, acao, detalhes)` service (`server/services/log.ts`). ADMIN can view logs at `/logs` with filters by user, action type, and date range.

## Environment

Copy `.env.example` to `.env`. Key vars:

- `PG_URL_1` — required, primary PostgreSQL connection string (takes precedence over `DATABASE_URL`)
- `DATABASE_URL` — required by Prisma migrations, set to same as PG_URL_1
- `PG_URL_2` — optional, backup PostgreSQL for failover
- `MYSQL_URL` — optional, MySQL connection string for backup
- `JWT_SECRET` — optional, auto-generated if weak/missing (persisted to `.jwt-secret` file)
- `ENCRYPTION_KEY` — optional, auto-generated if missing
- `ALLOWED_ORIGINS` — required, comma-separated CORS origins
- `SMTP_*` — optional, for email notifications

## Conventions

- **Commit format:** `tipo: descripcion` — types: feat, fix, security, docs, chore, deploy
- **Language:** UI strings are in Portuguese (pt-BR). Code identifiers also use Portuguese naming (`modulo`, `aula`, `licao`, `equipe`, `certificados`).
- **No test framework.** Verification is manual via API health check and seed data.
- **Deploy target:** cPanel with nginx reverse proxy. `deploy.sh` handles nginx snippet creation, build, and restart. Production runs `node dist/server/index.js` directly (not Passenger).

## Gotchas

- `pnpm build` must run `prisma generate` (PG + MySQL) before vite/tsc — the build script chains this automatically.
- `.htaccess` does nothing on nginx (production server). The nginx snippet in `deploy.sh` replaces its functionality.
- Vite dev server proxies `/api` to `http://localhost:3001` (not https).
- `app.js` and `Passengerfile.json` exist for Phusion Passenger but are NOT used by `deploy.sh`.
- No `typecheck` command — run `npx tsc --noEmit` for frontend or check server with `npx tsc --project tsconfig.server.json --noEmit` if needed.
- Prisma migrations live in `prisma/migrations/`. Use `prisma migrate dev` to create new ones locally.
- MySQL client is generated to `prisma/generated/mysql/` — this path is in `.gitignore`.
- `prisma-mysql.ts` uses `path.resolve(__dirname, ...)` for dynamic require because compiled output (`dist/server/lib/`) is deeper than source (`server/lib/`).
- When `MYSQL_URL` is not set, `prismaMysql` is `null` and all dual-write operations silently skip MySQL.
- When `NHOST_URL` is not set, `prismaNhost` is `null` and all dual-write operations silently skip Nhost.
- `PG_URL_1` takes precedence over `DATABASE_URL` as primary. If neither is set, the server won't start.
- `prisma.ts` uses `PG_URL_1 || DATABASE_URL` for the primary client. The database registry (`server/config/databases.ts`) manages all connections.
- **Dev mode has no failover**: Health checks, keepalive, and background sync only run when `NODE_ENV=production`. In dev, if the primary DB is down, reads fail immediately with no fallback.
- **CASL action list is hardcoded** in `authorize()` middleware — if you add a new CASL action in `server/auth/casl/actions.ts`, you must also add it to the detection list in `server/middleware/auth.ts`, otherwise it falls through to role-based auth.
- **CASL conditions must be JSON.stringified** when passed as third arg: `authorize('update', 'User', JSON.stringify({ gestorId: req.userId }))`.
- **Frontend CASL is custom** — `src/hooks/useAbility.ts` does NOT use the `@casl/ability` library at runtime. It implements a lightweight rule engine. The backend is always the source of truth.
- **Prisma uses PrismaPg adapter** (`@prisma/adapter-pg`), not the default binary engine. Connection goes through the `pg` driver with `ssl: { rejectUnauthorized: false }`.
- **MySQL uses MariaDB adapter** (`@prisma/adapter-mariadb`) — MariaDB is wire-compatible with MySQL but there could be edge cases.
- **Two PrismaClient instances for PG_URL_1**: `prisma.ts` creates one, `databases.ts` registry creates another. They share the same connection string but have separate connection pools.
- **`db-models.ts` always uses `allEntries[0]` as primary** regardless of health status, while `databases.ts` has a health-aware `getPrimary()`. These two "primary" concepts can diverge.
- **HTTPS auto-detection**: Server looks for `server/certs/key.pem` and `cert.pem` relative to `__dirname`. If found, creates HTTPS; otherwise plain HTTP.
- **JWT_SECRET fallback chain**: env var → `.jwt-secret` file → auto-generate random 64-byte hex and persist to `.jwt-secret`.
- **`PG_URL_1` through `PG_URL_10`** are supported — the registry scans up to 10 PG databases dynamically.
