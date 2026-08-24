# Architecture — Academia PayGas

Corporate LMS for PayGas gas station employees. React SPA + Express API + PostgreSQL (primary) + MySQL (backup).

## Project Structure

**Single package** — not a monorepo. Two compilation targets:

- `apps/web/src/` → frontend (Vite, React 19, outputs to `dist/`)
- `apps/api/apps/web/src/server/` → backend (TSC, Express 5, outputs to `dist/apps/api/apps/web/src/server/`)

Backend entry: `apps/api/apps/web/src/server/index.ts` (Express on port 3001).
Frontend entry: `apps/web/src/main.tsx` → `apps/web/src/App.tsx` (React Router, BrowserRouter).

### Path aliases

- `@/*` → `./apps/web/src/*` (frontend, via tsconfig.json + vite.config.ts)

### Two tsconfigs

| Config | Scope | Module | Notes |
|--------|-------|--------|-------|
| `tsconfig.json` | `apps/web/src/` (frontend) | ESNext/bundler | `noEmit: true`, excludes `apps/api/apps/web/src/server/` |
| `tsconfig.server.json` | `apps/api/apps/web/src/server/` | CommonJS/node | Outputs to `dist/apps/api/apps/web/src/server/` |

### Linter

**Biome** (not ESLint). Config in `biome.json`. Tabs, double quotes, trailing commas.
- `pnpm lint` → `biome check .`
- `pnpm lint:fix` → `biome check --write .`
- `pnpm format` → `biome format --write .`

### UI stack

shadcn/ui (new-york style), Radix UI primitives, TailwindCSS 4, Lucide icons. Components in `apps/web/src/components/ui/`.

### Backend routes

All under `/api/`. Route files in `apps/api/apps/web/src/server/routes/`:
`auth`, `usuarios`, `cms`, `certificates`, `notifications`, `progresso`, `dashboard`, `docs`, `analytics`, `forum`, `gamification`, `conquistas`, `public`, `modules`, `logs`, `xpconfig`, `import-export`, `adminDashboard`, `role-permissions`, `paygas-access`.

## Database

**Multi-database architecture with failover**: Reads failover to next healthy database. Writes go to all healthy databases in parallel. Background sync reconciles empty databases when they recover.

```env
# .env — Multi-PG configuration
PG_URL_1="postgres://...@supabase.co:5432/postgres?sslmode=require"   # Primary (takes precedence over DATABASE_URL)
PG_URL_2="postgres://...@nhost.run:5432/project?sslmode=require"     # Backup, failover for reads
DATABASE_URL="..."  # Legacy fallback (used if PG_URL_1 not set). Required by Prisma migrations.
MYSQL_URL="..."     # MySQL backup (different engine, third-tier)
NHOST_URL="..."     # Legacy Nhost backup (fallback if PG_URL_* not set)
```

- **PG_URL_1** through **PG_URL_10** supported — the registry scans dynamically.
- **Heartbeat**: `apps/api/apps/web/src/server/services/db-health.ts` pings every DB every **5s** (`SELECT 1`, backoff to 5min when offline). Drives failover (primary switch) and (re)connects the real-time listener.
- **Keep-alive**: Pings all databases every 12h to prevent free-tier pauses.
- **Sync — three layers**, from fastest to most thorough (see `apps/api/apps/web/src/server/services/db-sync.ts` and `db-realtime.ts` docstrings for the full rationale):
  1. **Real-time** (`db-realtime.ts`): Postgres triggers (`packages/db/prisma/migrations/20260824000000_add_realtime_sync_triggers`) `pg_notify` on every row change; the app `LISTEN`s on every healthy database and mirrors the single changed row to the others within milliseconds. Primary path while databases are online. DELETEs are logged but not propagated (no soft-delete policy).
  2. **Incremental catch-up** (`db-sync.ts`, every 10s): cheap safety net — pulls rows newer than a per-table `updatedAt`/`createdAt` cursor. Catches anything the real-time layer missed (LISTEN/NOTIFY is fire-and-forget; a notification raised while nobody is listening is lost).
  3. **Full hash-diff reconciliation** (`db-sync.ts`): the original `md5(row::text)` full-table comparison. Only runs at startup (seeds the incremental cursors), immediately on recovery from an outage, and every 15 minutes as a deep safety net.

**Naming gotcha:** The DB table is `Curso` but the frontend/CMS calls it "Curso". The field `cursoId` is `cursoId` in frontend context. This is cosmetic only — the schema is not changing.

#### Naming map (DB ↔ UI)

| Database (Prisma) | UI / API / CMS | Notes |
|-------------------|---------------|-------|
| `Curso` | **Curso** | Top-level learning unit. |
| `Aula` | Aula / Lesson section | Sub-unit of a Curso. |
| `Licao` | Lição / Lesson content | Leaf unit (video, text, PDF). |
| `RolesPermitidos` (JSON) | "Visible para…" field | Comma-separated at UI level. |
| `autoCertificado` | "Certificado automático" | Boolean feature flag per Curso. |
| `nivel` (User) | "Nível" | Derived `Math.floor(xp/2000)+1`. |
| `xp` (Float) | Pontos / XP | Configurable via `XPConfig`. |
| `gestorId` | "Meu gestor" / "Equipe" | Hierarchy link in team pages. |

When in doubt, the canonical identity is the **DB model name**. UI strings should map via this table, never invent new names.

### Data Access Layer (DAL)

All database access goes through `apps/api/apps/web/src/server/lib/db.ts`. Never call `prisma.*` directly in routes.

```ts
import { db } from '../lib/db'

// CRUD operations (dual-write to backups)
await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.upsert('progresso', { ... }, { ... }, { ... })
await db.delete('user', { id: '123' })

// Reads always use primary (PG_URL_1)
await db.findMany('curso', { where: { ativo: true } })
```

Models are configured in `apps/api/apps/web/src/server/lib/db-models.ts`. Each model maps PG, Nhost, and MySQL delegates. Nhost and MySQL are `null` when their URL env vars are not set — dual-write gracefully degrades.

**Gotcha:** `db.transaction()` only uses the primary Prisma client — no replication to backups. Raw queries (`db.queryRaw()`) also only hit primary.

## Encryption

AES-256-GCM payloads between client and server. Client fetches key from `GET /api/config` (requires auth token) before login. See `apps/web/src/lib/crypto.ts` (client) and `apps/api/apps/web/src/server/middleware/encryption.ts` (server).

## Email Service

Centralized email dispatch via `apps/api/apps/web/src/server/services/email.ts`. Primary: Gmail SMTP. Backup: Resend SMTP. Auto-fallback on failure. Every email BCCs `email@academia.paygas.com.br`. `sendEmail()` returns `{ success, messageId, error }`.

## Auth & Authorization

**Authentication**: JWT + bcryptjs. Five roles: `ADMIN`, `GESTOR`, `ATENDENTE`, `PARCEIRO_ACREDITADO`, `ERPS_REPRESENTANTE`. GESTOR is restricted to their own team members. Tokens verified via `apps/api/apps/web/src/server/middleware/auth.ts`.

**Authorization**: CASL-based RBAC/ABAC. All permission logic centralized in `apps/api/apps/web/src/server/auth/casl/`. Permissions are DB-driven via `RoleConfig` table — adding a new role is just a DB insert.

**Middleware** (`apps/api/apps/web/src/server/middleware/auth.ts`) supports both patterns:
```ts
// Role-based (backward compat)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred for new code)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User', JSON.stringify({ gestorId: req.userId })))
```

**Frontend permissions** (`apps/web/src/hooks/useAbility.ts`):
```tsx
const { can, cannot, isAdmin, isGestor, isAtendente, isParceiro, isErps } = useAbility()
if (can('delete', 'User')) { /* show delete button */ }
```

## Gamification / XP

XP points are configurable via the `XPConfig` table (editable by ADMIN at `/xp-config`). Values are decimals (Float). The `awardPoints` function in `apps/api/apps/web/src/server/services/gamification.ts` reads config from DB with a 60s in-memory cache, falling back to hardcoded defaults.

Level = `Math.floor(xp / 2000) + 1`. `awardPointsIfNotAwarded` deduplicates by (userId, action, details-as-dedupKey). `awardLoginPointsDaily` limits login XP to once per calendar day.

## Activity Logs

All user actions are logged to the `ActivityLog` table via the shared `logActivity(userId, acao, detalhes)` service (`apps/api/apps/web/src/server/services/log.ts`). ADMIN can view logs at `/logs` with filters by user, action type, and date range.

## Deployment

### Architecture

```
Browser (HTTPS 443)
    │
    ▼
nginx (SSL termination)
    │
    ├── /api/* ──────────► reverse proxy ──► Node.js (HTTP 3001)
    │                                           └── Express API
    │
    └── /* (estaticos) ──► dist/ (React SPA via try_files)
```

### Commands

```bash
# Deploy automatico
./deploy.sh

# Configurar nginx manualmente
sudo bash setup-nginx.sh

# Manual
git pull
npx prisma generate
npx prisma migrate deploy
npx vite build
npx tsc --project tsconfig.server.json
killall -9 node
PORT=3001 nohup node dist/apps/api/apps/web/src/server/index.js > logs/app.log 2>&1 &
```

## Gotchas

- `pnpm build` must run `prisma generate` (PG + MySQL) before vite/tsc — the build script chains this automatically.
- `.htaccess` does nothing on nginx (production server). The nginx snippet in `deploy.sh` replaces its functionality.
- Vite dev server proxies `/api` to `http://localhost:3001` (not https).
- **Dev mode has no failover**: Health checks, keepalive, and background sync only run when `NODE_ENV=production`. In dev, if the primary DB is down, reads fail immediately with no fallback. **Override**: set `DB_INFRA_DEV=1` to enable the same infra services during local development.
- **CASL action list is centralized** in `packages/shared/src/shared/casl/actions.ts` (re-exported by `apps/api/apps/web/src/server/auth/casl/actions.ts`). `KNOWN_ACTIONS` derives from this single source — adding a new action here is enough for `authorize()` to detect it. Frontend imports the same file via `@packages/shared/src/shared/casl/actions`, so it cannot drift.
- **CASL conditions must be JSON.stringified** when passed as third arg: `authorize('update', 'User', JSON.stringify({ gestorId: req.userId }))`.
- **Frontend CASL is custom** — `apps/web/src/hooks/useAbility.ts` does NOT use the `@casl/ability` library at runtime. It implements a lightweight rule engine. The backend is always the source of truth.
- **Prisma uses PrismaPg adapter** (`@packages/db/prisma/adapter-pg`), not the default binary engine. Connection goes through the `pg` driver with `ssl: { rejectUnauthorized: false }`.
- **MySQL uses MariaDB adapter** (`@packages/db/prisma/adapter-mariadb`) — MariaDB is wire-compatible with MySQL but there could be edge cases.
- **Single PrismaClient for PG_URL_1**: `apps/api/apps/web/src/server/lib/prisma.ts` is a shim over `dbRegistry.getPrimary()` (apps/api/apps/web/src/server/config/databases.ts). Both `db.transaction()` and the DAL share the same pool. The DAL re-resolves the primary whenever `db-health` invalidates the cache.
- **`db-models.ts` uses health-aware `getPrimary()`** from the registry. When a database transitions health state, `db-health` calls `invalidateDelegateCache()` so reads re-route through the new primary.
- **Backup tiers warn on missing config**: at DAL startup, if `MYSQL_URL`, `NHOST_URL`, or additional `PG_URL_*` are not configured the DAL logs a single warning so silent degradation is visible to operators.
- **HTTPS auto-detection**: Server looks for `apps/api/apps/web/src/server/certs/key.pem` and `cert.pem` relative to `__dirname`. If found, creates HTTPS; otherwise plain HTTP.
- **Real-time sync (`db-realtime.ts`) requires a persistent process** — it holds a long-lived `pg.Client` per database with `LISTEN` open. This works on cPanel and local dev, but **does NOT work on Vercel serverless functions** (see `DEPLOY-VERCEL-CLOUDFLARE.md`): each invocation is a short-lived, isolated process, so a `LISTEN` connection can't be kept open across requests. On serverless, only the incremental + full-diff layers apply — which is one more reason the Vercel deployment is configured to skip the multi-DB setup entirely (single Neon Postgres, no dual-write/backups).
- **JWT_SECRET fallback chain**: env var → `.jwt-secret` file → auto-generate random 64-byte hex and persist to `.jwt-secret`.
- When `MYSQL_URL` is not set, `prismaMysql` is `null` and all dual-write operations silently skip MySQL. **A warning is logged** so this isn't invisible.
- When `NHOST_URL` is not set, `prismaNhost` is `null` and all dual-write operations silently skip Nhost.
- `PG_URL_1` takes precedence over `DATABASE_URL` as primary. If neither is set, the server won't start.
- Prisma migrations live in `packages/db/prisma/migrations/`. Use `prisma migrate dev` to create new ones locally.
- MySQL client is generated to `packages/db/prisma/generated/mysql/` — this path is in `.gitignore`.
- `prisma-mysql.ts` uses `path.resolve(__dirname, ...)` for dynamic require because compiled output (`dist/apps/api/apps/web/src/server/lib/`) is deeper than source (`apps/api/apps/web/src/server/lib/`).
- **Shared CASL constants** live in `packages/shared/src/shared/casl/actions.ts`. Both server (`apps/api/apps/web/src/server/auth/casl/`) and client (`apps/web/src/auth/casl/`) re-export from there. Never duplicate the literal arrays inline.
