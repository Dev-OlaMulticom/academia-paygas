# AGENTS.md — Academia PayGas

**Project:** Corporate LMS for PayGas gas station employees. React SPA + Express API + PostgreSQL (primary) + MySQL (backup).

**Quick links:** [Architecture](#architecture) • [Roles & Permissions](#roles--permissions) • [Gotchas](#gotchas) • [Conventions](#conventions)

---

## Pre-flight Checklist

Before starting any work:

```bash
pnpm --version                # Verify package manager
pnpm install                  # Install dependencies
ls .env                       # Verify environment file (copy from .env.example if missing)
rg --version; fd --version   # Verify CLI tools
```

## Commands

### Development

```bash
# Full dev environment (frontend + backend concurrently)
pnpm dev              # Vite :5173 + Express :3001 with hot reload

# Frontend only
pnpm dev:client       # Vite dev server :5173

# Backend only
pnpm dev:server       # tsx watch apps/api/apps/web/src/server/index.ts :3001
```

### Build & Deploy

```bash
pnpm build            # Complete build: prisma generate → vite build + tsc server
pnpm build:client     # Vite build only
pnpm build:server     # TypeScript server build only
pnpm start            # Run built server (requires pnpm build first)
./deploy.sh           # Production deploy: builds, restarts, nginx
```

### Code Quality

```bash
pnpm lint             # Biome check (no auto-fix)
pnpm lint:fix         # Biome check with auto-fix
pnpm format           # Biome format (reflow code)

# Typecheck (no dedicated script)
npx tsc --noEmit                                    # Frontend typecheck
npx tsc --project tsconfig.server.json --noEmit    # Backend typecheck
```

### Testing

```bash
pnpm test             # Run all tests (node --import tsx --test tests/*.test.ts)
```

### Database

```bash
npx prisma generate                                # Generate PG Prisma client
npx prisma generate --schema=packages/db/prisma/schema.mysql.prisma  # Generate MySQL client
npx prisma migrate deploy                          # Apply pending migrations
pnpm db:seed                                       # Seed test users
pnpm db:reset                                      # Reset DB + seed
pnpm db:sync-mysql                                 # One-time: copy PG → MySQL
```

## Architecture

Single package, two compilation targets:

| Target | Source | Output | Config |
|--------|--------|--------|--------|
| Frontend | `apps/web/src/` | `dist/` | `tsconfig.json` (ESNext/bundler, `noEmit: true`) |
| Backend | `apps/api/apps/web/src/server/` | `dist/apps/api/apps/web/src/server/` | `tsconfig.server.json` (CommonJS/node, `rootDir: "./"`, `outDir: "./dist"`) |
| Shared | `packages/shared/src/shared/` | `dist/packages/shared/src/shared/` (compiled by tsc) | `@packages/shared/src/shared/*` alias in both tsconfigs + vite |

Entry points: `apps/api/apps/web/src/server/index.ts` (Express :3001), `apps/web/src/main.tsx` → `apps/web/src/App.tsx` (React Router).

### Path aliases

- `@/*` → `./apps/web/src/*` (frontend only)
- `@packages/shared/src/shared/*` → `./packages/shared/src/shared/*` (both frontend and backend)

### Linter

**Biome** (not ESLint). Config in `biome.json`. Tabs, double quotes, trailing commas, lineWidth 120.
Excludes: `dist/`, `node_modules/`, `*.js`, `wordpress-plugin-academia-paygas/`, `api/`, `styles/`.

### UI

shadcn/ui (new-york style), Radix UI, TailwindCSS 4, Lucide icons. Components in `apps/web/src/components/ui/`.
Config: `components.json`, `tailwind.config.ts`, `postcss.config.mjs`.

### Backend routes

All under `/api/`. Route files in `apps/api/apps/web/src/server/routes/`:
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

All DB access through `apps/api/apps/web/src/server/lib/db.ts`. **Never call `prisma.*` directly in routes.**

```ts
import { db } from '../lib/db'
await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.findMany('curso', { where: { ativo: true } })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.delete('user', { id: '123' })
```

Models configured in `apps/api/apps/web/src/server/lib/db-models.ts`. MySQL and Nhost are `null` when unconfigured — dual-write silently skips them.

### Auth & Authorization

JWT + bcryptjs. **Five roles:** `ADMIN`, `GESTOR`, `ATENDENTE`, `PARCEIRO_ACREDITADO`, `ERPS_REPRESENTANTE`.

Tokens verified via `apps/api/apps/web/src/server/middleware/auth.ts`.

CASL-based RBAC/ABAC centralized in `apps/api/apps/web/src/server/auth/casl/`. Permissions DB-driven via `RoleConfig` table.

```ts
// Role-based (backward compat)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred for new code)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User', JSON.stringify({ gestorId: req.userId })))
```

Frontend permissions via `apps/web/src/hooks/useAbility.ts` (custom lightweight engine, NOT `@casl/ability` runtime).

### Encryption

AES-256-GCM between client and server. Client fetches key from `GET /api/config` (requires auth token) before login.
Client: `apps/web/src/lib/crypto.ts`. Server: `apps/api/apps/web/src/server/middleware/encryption.ts`.

### Email

Centralized via `apps/api/apps/web/src/server/services/email.ts`. Gmail SMTP primary, Resend SMTP backup, auto-fallback. Every email BCCs `email@academia.paygas.com.br`.

### Gamification

XP configurable via `XPConfig` table. Level = `Math.floor(xp / 2000) + 1`. `awardPoints` in `apps/api/apps/web/src/server/services/gamification.ts` with 60s cache.

### Activity Logs

All user actions logged via `logActivity(userId, acao, detalhes)` in `apps/api/apps/web/src/server/services/log.ts`.

## Roles & Permissions

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|-------------|
| `ADMIN` | Full system access | CRUD all resources, manage all users, approve certificates |
| `GESTOR` | Team manager (Gestor / Líder) | Create/manage ATENDENTE, view team reports |
| `ATENDENTE` | Frontline employee | Complete courses, view progress, request certificates |
| `PARCEIRO_ACREDITADO` | Accredited partner | View/manage content, moderate forums |
| `ERPS_REPRESENTANTE` | ERP system representative | View reports, export data |

### CASL Actions

Shared actions defined in `packages/shared/src/shared/casl/actions.ts`:
- `create`, `read`, `update`, `delete`, `manage`
- `assignRole`, `sendNotification`
- `approveCertificate`, `issueCertificate`
- `viewTeam`, `exportData`
- `deleteActivityLog`, `deleteNotification`, `deleteXPConfig`

### Frontend Role Labels

Role labels are database-driven via `RoleConfig` table. Frontend uses `apps/web/src/data/role-labels.ts` for sync access.

**Default visual mapping (configurable):**
| Role | Avatar BG | Icon |
|------|-----------|------|
| ADMIN | var(--pg-red) | Shield |
| GESTOR | var(--pg-gold) | Users |
| ATENDENTE | var(--pg-green) | User |
| PARCEIRO_ACREDITADO | #8b5cf6 | Star |
| ERPS_REPRESENTANTE | #06b6d4 | Chart |

### Permission Matrix

| Resource | ADMIN | GESTOR | ATENDENTE | PARCEIRO_ACREDITADO | ERPS_REPRESENTANTE |
|----------|-------|--------|-----------|---------------------|-------------------|
| Users | CRUD all | Read/Create (team) | Read (self) | Read (all) | Read (all) |
| Modules | CRUD all | Read | Read | CRUD all | Read |
| Quizzes | CRUD all | Read | Respond | CRUD all | Read |
| Certificates | Approve/Issue | Request | Request | Approve/Issue | Read |
| Reports | All | Team only | Self only | All | All |

## Security Best Practices

### Authentication & Authorization

- **Never disable auth middleware** — `authenticate` and `authorize` are non-negotiable
- **Always validate input** — User input is untrusted by default
- **Use prepared queries** — Prisma (via DAL) handles this; never concatenate SQL
- **Implement rate limiting** — Use `express-rate-limit` for API endpoints
- **JWT tokens are time-limited** — Verify `exp` claim in `apps/api/apps/web/src/server/middleware/auth.ts`

### Common Vulnerabilities to Avoid

| Vulnerability | Prevention | Example |
|--------------|-----------|---------|
| SQL Injection | Use DAL + Prisma | ✅ `db.findMany('user', ...)` <br> ❌ `prisma.$queryRaw(\`SELECT * FROM User WHERE id = ${id}\`)` |
| CSRF | Express session + CORS | CORS configured in `apps/api/apps/web/src/server/index.ts` |
| XSS | React auto-escapes | Use `dangerouslySetInnerHTML` only when necessary |
| Broken Auth | JWT + bcryptjs | Passwords hashed with bcryptjs, tokens signed with JWT_SECRET |
| Data Exposure | Encryption middleware | AES-256-GCM enabled for sensitive data |
| Insecure Direct References | CASL permissions | Check `can('read', 'User')` before serving data |

### Secrets Management

```bash
# ✅ CORRECT
JWT_SECRET=<32+ chars in .env>           # Auto-persists to .jwt-secret if missing
DATABASE_URL="postgres://..."
PG_URL_1="postgres://..."

# ❌ WRONG
const secret = "hardcoded-secret"        # NEVER hardcode secrets
```

### Rate Limiting

```ts
// Example: Protect auth endpoints
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Muitas tentativas, tente mais tarde',
})

router.post('/login', authLimiter, handler)
```

## Gotchas

- **CASL action list is hardcoded** in `authorize()` middleware — if you add a new CASL action in `packages/shared/src/shared/casl/actions.ts`, it's auto-detected via `KNOWN_ACTIONS` from `apps/api/apps/web/src/server/auth/casl/actions.ts`. Verify the import chain stays intact.
- **CASL conditions must be JSON.stringified**: `authorize('update', 'User', JSON.stringify({ gestorId: req.userId }))`.
- **Frontend CASL is custom** — `apps/web/src/hooks/useAbility.ts` does NOT use `@casl/ability` at runtime. Backend is always source of truth.
- **Naming gotcha:** DB table is `Curso` but frontend/CMS calls it "Curso". `cursoId` = `cursoId` in frontend. Cosmetic only.
- **`prisma.config.ts`** auto-detects `--schema` arg to pick PG vs MySQL URL. Don't hardcode the datasource URL in `schema.prisma`.
- **`pnpm build`** must run `prisma generate` (PG + MySQL) before vite/tsc — the script chains this automatically with `concurrently`.
- **`tsconfig.server.json`** uses `rootDir: "./"` with `outDir: "./dist"`. This means `apps/api/apps/web/src/server/index.ts` compiles to `dist/apps/api/apps/web/src/server/index.js` and `packages/shared/src/shared/casl/actions.ts` compiles to `dist/packages/shared/src/shared/casl/actions.js`. Do NOT change `outDir` to `"./dist/server"` — it would produce `dist/apps/api/apps/web/src/server/apps/api/apps/web/src/server/index.js` (double `server`) breaking the start command.
- **Two PrismaClient instances** for PG_URL_1: `apps/api/apps/web/src/server/lib/prisma.ts` (lazy Proxy) and `apps/api/apps/web/src/server/config/databases.ts` (registry). They now share the same pool via `getPrimaryPrisma()`.
- **`db.transaction()`** only uses primary Prisma client — no replication to backups. Raw queries (`db.queryRaw()`) also only hit primary.
- **Prisma uses PrismaPg adapter** (`@packages/db/prisma/adapter-pg`), not the default binary engine. SSL: `{ rejectUnauthorized: false }`.
- **MySQL uses MariaDB adapter** (`@packages/db/prisma/adapter-mariadb`). MySQL schema uses `prisma db push` (no migrations).
- **MySQL client generated to `packages/db/prisma/generated/mysql/`** — this path is in `.gitignore`.
- **HTTPS auto-detection**: Server looks for `apps/api/apps/web/src/server/certs/key.pem` and `cert.pem` relative to `__dirname`.
- **JWT_SECRET fallback chain**: env var (≥32 chars) → `.jwt-secret` file (≥16 chars) → auto-generate 64-byte hex and persist.
- **`.htaccess` does nothing on nginx** — the nginx snippet in `deploy.sh` replaces its functionality.
- **Vite dev proxy**: `/api` → `http://localhost:3001` (not https).
- **`app.js` and `Passengerfile.json`** exist for Phusion Passenger but are NOT used by `deploy.sh`.
- **`prisma-mysql.ts`** uses `path.resolve(__dirname, ...)` for dynamic require because compiled output is deeper than source.

## Conventions

- **Commit format:** `tipo: descripcion` — types: feat, fix, security, docs, chore, deploy
- **Language:** UI strings in Portuguese (pt-BR). Code identifiers also Portuguese (`curso`, `aula`, `licao`, `equipe`, `certificados`).
- **Deploy target:** cPanel with nginx reverse proxy. `deploy.sh` handles nginx snippet, build, restart. Production runs `node dist/apps/api/apps/web/src/server/index.js` directly (not Passenger).

## Tests

Smoke tests using Node.js built-in test runner + tsx loader (no Jest/Vitest):

```bash
pnpm test    # runs tests/*.test.ts
```

| File | Covers |
|------|--------|
| `tests/casl-shared.test.ts` | `packages/shared/src/shared/casl/actions.ts` consistency |
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

## Recent Changes

- **DB-driven CASL permissions + 2 new roles** (`PARCEIRO_ACREDITADO`, `ERPS_REPRESENTANTE`)
- **Biome replaces ESLint** (config in `biome.json`)
- **Vite 6 → 8** upgrade
- **CSV unificado** frontend downloads
- **PDF viewer height reduction** + CSP framing fix
- **RoleConfig table** for runtime role label customization
- **`useAbility()`** hook replaces hardcoded role checks
- **Design system V27** — unified colors with `--pg-orange (#F47C20)` as primary brand color
- **Role label rename** `Gestor de Posto` → `Gestor / Líder`
- **`console.*` replaced with Pino logger** across server

## Documentation Index

| Document | Location | Description |
|----------|----------|-------------|
| Project README | `README.md` | Stack, roles, endpoints, schema, deploy |
| AGENTS | `AGENTS.md` | This file — agent guide |
| Architecture | `architecture.md` | Project structure, DB, auth, encryption, email, gamification, deployment, gotchas |
| Design System | `DESIGN.md` | Tokens, layout, components, buttons, badges, themes, responsive rules |
| Coding Rules | `coding-rules.md` | Style, naming, React/Express patterns, security, anti-patterns |
| Workflow | `workflow.md` | 10-step development workflow |
| Task Master | `taskmaster.md` | Task Master AI commands, statuses, workflow |
| Memory | `memory.md` | codebase-memory-mcp usage |
| Testing | `testing.md` | Verification commands, manual testing, completeness criteria |
| Deploy cPanel | `DEPLOY-CPANEL.md` | Detailed cPanel deployment guide, nginx proxy, SSL |
| Security Changes | `SECURITY_CHANGES.md` | Security fixes: encryption, JWT, rate limiting, tokens |
| Connection Analysis | `RESULTADO_ANALISIS.md` | DB connection & migration verification (historical) |
