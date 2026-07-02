# AGENTS.md — Academia PayGas

Corporate LMS for PayGas gas station employees. React SPA + Express API + PostgreSQL (primary) + MySQL (backup).

> **Extended docs** live in `.ai/` — architecture, coding rules, workflow, testing, task-master, memory.

## Commands

```bash
pnpm dev              # frontend (Vite :5173) + backend (tsx watch :3001) concurrently
pnpm build            # prisma generate (PG+MySQL) → vite build + tsc server
pnpm start            # node dist/server/index.js (requires build first)
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
pnpm format           # biome format --write .
pnpm test             # node --import tsx --test tests/*.test.ts

# Typecheck (no dedicated script)
npx tsc --noEmit                                    # frontend
npx tsc --project tsconfig.server.json --noEmit     # server

# Database
npx prisma generate                                # PG client
npx prisma generate --schema=prisma/schema.mysql.prisma  # MySQL client
npx prisma migrate deploy                          # apply migrations
pnpm db:seed                                       # test users (admin/gestor/atendentes)
pnpm db:reset                                      # reset + seed
pnpm db:sync-mysql                                 # initial PG → MySQL copy

# Deploy
./deploy.sh              # auto-detects nginx, builds, restarts
```

**Pre-flight:** `pnpm --version`, `pnpm install`, `.env` exists (copy from `.env.example`).

## Architecture

Single package, two compilation targets:

| Target | Source | Output | Config |
|--------|--------|--------|--------|
| Frontend | `src/` | `dist/` | `tsconfig.json` (ESNext/bundler, `noEmit: true`) |
| Backend | `server/` | `dist/server/` | `tsconfig.server.json` (CommonJS/node, `rootDir: "./"`, `outDir: "./dist"`) |
| Shared | `shared/` | `dist/shared/` (compiled by tsc) | `@shared/*` alias in both tsconfigs + vite |

Entry points: `server/index.ts` (Express :3001), `src/main.tsx` → `src/App.tsx` (React Router).

### Path aliases

- `@/*` → `./src/*` (frontend only)
- `@shared/*` → `./shared/*` (both frontend and backend)

### Linter

**Biome** (not ESLint). Config in `biome.json`. Tabs, double quotes, trailing commas, lineWidth 120.
Excludes: `dist/`, `node_modules/`, `*.js`, `wordpress-plugin-academia-paygas/`, `api/`, `styles/`.

### UI

shadcn/ui (new-york style), Radix UI, TailwindCSS 4, Lucide icons. Components in `src/components/ui/`.
Config: `components.json`, `tailwind.config.ts`, `postcss.config.mjs`.

### Backend routes

All under `/api/`. Route files in `server/routes/`:
`auth`, `usuarios`, `cms`, `certificates`, `notifications`, `progresso`, `dashboard`, `docs`, `analytics`, `forum`, `gamification`, `conquistas`, `public`, `modules`, `logs`, `xpconfig`, `import-export`, `adminDashboard`, `role-permissions`, `paygas-access`.

### Database

Multi-PG with failover. Reads failover to next healthy PG. Writes go to all healthy PGs in parallel + MySQL (fire-and-forget).

```env
PG_URL_1="postgres://..."    # Primary (takes precedence over DATABASE_URL)
PG_URL_2="postgres://..."    # Backup, failover for reads
PG_URL_3..10                  # Additional backups (auto-discovered)
DATABASE_URL="..."            # Legacy fallback, required by Prisma migrations
MYSQL_URL="..."               # MySQL backup (different engine, third-tier)
NHOST_URL="..."               # Legacy Nhost backup (fallback if no PG_URL_*)
```

Health checks every 60s, keep-alive every 12h, background sync on recovery. **Dev mode has no failover** — health checks/sync only run in production (or with `DB_INFRA_DEV=1`).

### Data Access Layer (DAL)

All DB access through `server/lib/db.ts`. **Never call `prisma.*` directly in routes.**

```ts
import { db } from '../lib/db'
await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.findMany('modulo', { where: { ativo: true } })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.delete('user', { id: '123' })
```

Models configured in `server/lib/db-models.ts`. MySQL and Nhost are `null` when unconfigured — dual-write silently skips them.

### Auth & Authorization

JWT + bcryptjs. Five roles: `ADMIN`, `GESTOR`, `ATENDENTE`, `PARCEIRO_ACREDITADO`, `ERPS_REPRESENTANTE`.
Tokens verified via `server/middleware/auth.ts`.

CASL-based RBAC/ABAC centralized in `server/auth/casl/`. Permissions DB-driven via `RoleConfig` table.

```ts
// Role-based (backward compat)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred for new code)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User', JSON.stringify({ gestorId: req.userId })))
```

Frontend permissions via `src/hooks/useAbility.ts` (custom lightweight engine, NOT `@casl/ability` runtime).

### Encryption

AES-256-GCM between client and server. Client fetches key from `GET /api/config` (requires auth token) before login.
Client: `src/lib/crypto.ts`. Server: `server/middleware/encryption.ts`.

### Email

Centralized via `server/services/email.ts`. Gmail SMTP primary, Resend SMTP backup, auto-fallback. Every email BCCs `email@academia.paygas.com.br`.

### Gamification

XP configurable via `XPConfig` table. Level = `Math.floor(xp / 2000) + 1`. `awardPoints` in `server/services/gamification.ts` with 60s cache.

### Activity Logs

All user actions logged via `logActivity(userId, acao, detalhes)` in `server/services/log.ts`.

## Gotchas

- **CASL action list is hardcoded** in `authorize()` middleware — if you add a new CASL action in `shared/casl/actions.ts`, it's auto-detected via `KNOWN_ACTIONS` from `server/auth/casl/actions.ts`. Verify the import chain stays intact.
- **CASL conditions must be JSON.stringified**: `authorize('update', 'User', JSON.stringify({ gestorId: req.userId }))`.
- **Frontend CASL is custom** — `src/hooks/useAbility.ts` does NOT use `@casl/ability` at runtime. Backend is always source of truth.
- **Naming gotcha:** DB table is `Modulo` but frontend/CMS calls it "Curso". `moduloId` = `cursoId` in frontend. Cosmetic only.
- **`prisma.config.ts`** auto-detects `--schema` arg to pick PG vs MySQL URL. Don't hardcode the datasource URL in `schema.prisma`.
- **`pnpm build`** must run `prisma generate` (PG + MySQL) before vite/tsc — the script chains this automatically.
- **`tsconfig.server.json`** uses `rootDir: "./"` with `outDir: "./dist"`. This means `server/index.ts` compiles to `dist/server/index.js` and `shared/casl/actions.ts` compiles to `dist/shared/casl/actions.js`. Do NOT change `outDir` to `"./dist/server"` — it would produce `dist/server/server/index.js` (double `server`) breaking the start command.
- **Two PrismaClient instances** for PG_URL_1: `server/lib/prisma.ts` (lazy Proxy) and `server/config/databases.ts` (registry). They now share the same pool via `getPrimaryPrisma()`.
- **`db.transaction()`** only uses primary Prisma client — no replication to backups. Raw queries (`db.queryRaw()`) also only hit primary.
- **Prisma uses PrismaPg adapter** (`@prisma/adapter-pg`), not the default binary engine. SSL: `{ rejectUnauthorized: false }`.
- **MySQL uses MariaDB adapter** (`@prisma/adapter-mariadb`). MySQL schema uses `prisma db push` (no migrations).
- **MySQL client generated to `prisma/generated/mysql/`** — this path is in `.gitignore`.
- **HTTPS auto-detection**: Server looks for `server/certs/key.pem` and `cert.pem` relative to `__dirname`.
- **JWT_SECRET fallback chain**: env var (≥32 chars) → `.jwt-secret` file (≥16 chars) → auto-generate 64-byte hex and persist.
- **`.htaccess` does nothing on nginx** — the nginx snippet in `deploy.sh` replaces its functionality.
- **Vite dev proxy**: `/api` → `http://localhost:3001` (not https).
- **`app.js` and `Passengerfile.json`** exist for Phusion Passenger but are NOT used by `deploy.sh`.
- **`prisma-mysql.ts`** uses `path.resolve(__dirname, ...)` for dynamic require because compiled output is deeper than source.

## Conventions

- **Commit format:** `tipo: descripcion` — types: feat, fix, security, docs, chore, deploy
- **Language:** UI strings in Portuguese (pt-BR). Code identifiers also Portuguese (`modulo`, `aula`, `licao`, `equipe`, `certificados`).
- **Deploy target:** cPanel with nginx reverse proxy. `deploy.sh` handles nginx snippet, build, restart. Production runs `node dist/server/index.js` directly (not Passenger).

## Tests

Smoke tests using Node.js built-in test runner + tsx loader (no Jest/Vitest):

```bash
pnpm test    # runs tests/*.test.ts
```

| File | Covers |
|------|--------|
| `tests/casl-shared.test.ts` | `shared/casl/actions.ts` consistency |
| `tests/jwt-fallback.test.ts` | JWT_SECRET fallback chain |

Add a new test file → picked up automatically by `pnpm test`.

## Codebase Tools

### codebase-memory-mcp (Always-On)

**Always index the codebase** using `codebase-memory-mcp` tools. They are the PRIMARY method for code discovery.

**Priority Order:**
1. `search_graph` — find functions, classes, routes by pattern
2. `trace_path` — trace callers/callees, data flow, cross-service calls
3. `get_code_snippet` — read function/class source code
4. `query_graph` — run Cypher queries for complex patterns
5. `get_architecture` — high-level project overview

**Fallback to grep/glob ONLY when:**
- Searching string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts)
- MCP tools return insufficient results

### Task Master AI

Task list lives in `.taskmaster/tasks/tasks.json`. Individual task files in `.taskmaster/tasks/`.

**Workflow:**
```
1. Parse PRD → task-master parse-prd .taskmaster/docs/prd.md
2. Expand tasks → task-master expand --all
3. Pick next → npx task-master next
4. Work on it → npx task-master set-status --id=<id> --status=in-progress
5. Done → npx task-master set-status --id=<id> --status=done
```

**Useful commands:**
```bash
npx task-master list              # show all tasks
npx task-master next              # next available task
npx task-master show <id>         # task details
npx task-master add-task --title="..." --description="..." --priority=<high|medium|low>
npx task-master set-status --id=<id> --status=done
npx task-master expand --id=<id>  # break into subtasks
```

**Note:** AI features (parse-prd, expand, add-task with --prompt) require API keys in `.env`:
- `ANTHROPIC_API_KEY` (recommended) or `OPENAI_API_KEY` or `GOOGLE_API_KEY`
- `PERPLEXITY_API_KEY` (optional, for research mode)

### Preferred CLI Tools

| Task | Tool | NOT |
|------|------|-----|
| Text search | `rg` | `grep` |
| File search | `fd` | `find` |
| Refactoring | `ast-grep` | — |
| Symbol navigation | LSP | — |

Fallback to grep/find only if the above are unavailable.

## Documentation Index

| Document | Location |
|----------|----------|
| Architecture | `.ai/architecture.md` |
| Coding Rules | `.ai/coding-rules.md` |
| Workflow | `.ai/workflow.md` |
| Task Master | `.ai/taskmaster.md` |
| Memory | `.ai/memory.md` |
| Testing | `.ai/testing.md` |
