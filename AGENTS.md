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
pnpx db:generate:mysql   # same as above
pnpx db:sync-mysql       # initial sync PG → MySQL (runs pg-dump + mysql import)

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

**Multi-database architecture with failover**: Reads failover to next healthy database. Writes go to all healthy databases in parallel. Background sync reconciles data when databases recover.

- **PG_URL_1**: Primary PostgreSQL (Supabase). All reads + writes.
- **PG_URL_2**: Backup PostgreSQL (Nhost). Failover for reads. Writes are best-effort.
- **DATABASE_URL**: Legacy fallback (used if PG_URL_1 not set).
- **MYSQL_URL**: Backup/redundancy (third-tier, different engine).
- **Health checks**: Every 60s, monitors all databases. Exponential backoff for disconnected ones.
- **Keep-alive**: Pings all databases every 12h to prevent free-tier pauses.
- **Background sync**: When a database recovers, syncs all data from healthiest database automatically.

```env
# .env — Multi-PG configuration
PG_URL_1="postgres://...@supabase.co:5432/postgres?sslmode=require"   # Primary
PG_URL_2="postgres://...@nhost.run:5432/project?sslmode=require"     # Backup
DATABASE_URL="..."  # Legacy fallback (if PG_URL_1 not set)
MYSQL_URL="..."     # MySQL backup (different engine)
```

```ts
// Health endpoint returns all databases
GET /api/health → {
  status: "ok",
  primary: "supabase",
  databases: {
    supabase: "connected",
    nhost: "connected",
    mysql: "connected"
  },
  summary: { total: 2, healthy: 2, unhealthy: 0 }
}
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

// Reads always use Supabase (primary)
await db.findMany('modulo', { where: { ativo: true } })

// Health check returns all three databases
await db.healthCheck() // { supabase: 'connected', nhost: 'connected', mysql: 'connected' }
```

Models are configured in `server/lib/db-models.ts`. Each model maps PG, Nhost, and MySQL delegates. Nhost and MySQL are `null` when their URL env vars are not set — dual-write gracefully degrades.

### Encryption

AES-256-GCM payloads between client and server. Client fetches key from `GET /api/config` before login. See `src/lib/crypto.ts` (client) and `server/middleware/encryption.ts` (server).

### Email Service (High Reliability & Failover)

 Centralized email dispatch via `server/services/email.ts`.
- **Primary SMTP**: Gmail SMTP (`smtp.gmail.com:587`, TLS) using `dev.olamulticom@gmail.com`.
- **Backup SMTP**: Resend SMTP (`smtp.resend.com:465`, SSL) with API key credentials.
- **Auto-fallback & Multi-Try**: Failures with Gmail automatically fallback to Resend.
- **BCC & Reply-To Compliance**: Every outgoing email is blind-copied (BCC) to `email@academia.paygas.com.br` and sets the Reply-To header to `email@academia.paygas.com.br`.
- **Audit/Monitoring Pipeline**: For every successfully dispatched email, a copy of the notification metadata is forwarded to `onboarding@resend.dev` via Resend for central monitoring and tracking.
- **Non-silent errors**: `sendEmail()` returns an `EmailResult` object containing `{ success, messageId, error }` instead of failing silently, ensuring callers (auth registration, certificate creation, etc.) can detect and handle dispatch issues.

### Quiz Editor (Dedicated Full-Page Admin)

Located at `/cms/:moduloId/quiz/:aulaId` (`src/pages/QuizEditorPage.tsx`), replacing the old modal-based editor for superior UX.
- **Layout**: Two-column layout with a scrollable list of questions on the left, and an active question editor form/metadata configurator on the right. Fully responsive for mobile stacking.
- **Metadata Management**: Edit title, minimum passing grade (0-10, with real-time feedback on how many correct answers are required based on total questions), and auto-certificate generation.
- **Question CRUD**: Dynamically create, edit, reorder, and delete quiz questions (A/B/C/D choices with correct answer indicator).

### Auth & Authorization

**Authentication**: JWT + bcryptjs. Three roles: `ADMIN`, `GESTOR`, `ATENDENTE`. GESTOR is restricted to their own team members. Tokens verified via `server/middleware/auth.ts`.

**Authorization**: CASL-based RBAC/ABAC. All permission logic centralized in `server/auth/casl/`.

```
server/auth/casl/
  actions.ts          # CASL action constants (create, read, update, delete, manage, ...)
  subjects.ts         # CASL subject constants (User, Modulo, Team, Message, ...)
  ability.ts          # AppAbility type definition
  defineAbility.ts    # Central ability builder — merges all policies
  policies/
    user.policy.ts    # User entity permissions
    team.policy.ts    # Team aggregate permissions
    message.policy.ts # Notification permissions
```

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

## Database Tables (17 models)

| Table | Description |
|-------|-------------|
| `User` | Usuarios del sistema (email, nome, senha, role, xp, level) |
| `Modulo` | Cursos/modules del LMS (titulo, descricao, ordem,视频Url) |
| `Aula` | Secciones dentro de un modulo (titulo, tipo: VIDEO/PDF/TEXTO) |
| `Licao` | Contenido individual (video, texto, PDF) |
| `Quiz` | Cuestionarios por aula (1:1 con Aula) |
| `QuizPergunta` | Preguntas del quiz (opcaoA/B/C/D, correta) |
| `QuizResponse` | Respuestas de usuarios a quizzes |
| `Progresso` | Progreso de usuario por aula |
| `Certificate` | Certificados (PENDING/APPROVED/ISSUED) |
| `Notification` | Notificaciones in-app (from/to) |
| `ActivityLog` | Audit log de acciones |
| `PointsTransaction` | Transacciones XP |
| `ForumPost` | Posts del foro |
| `ModuleConfig` | Config de modulos del sidebar (enabled/disabled) |
| `XPConfig` | Config de puntos XP por accion |
| `Conquista` | Logros/achievements |
| `UserConquista` | Relacion usuario-conquista |

### Enums

| Enum | Values |
|------|--------|
| `Role` | ADMIN, GESTOR, ATENDENTE |
| `CertificateStatus` | PENDING, APPROVED, ISSUED |
| `AulaTipo` | VIDEO, PDF, TEXTO |
| `PointsAction` | LOGIN, MODULE_OPEN, LESSON_VIEW, LESSON_COMPLETE, MODULE_COMPLETE, QUIZ_CORRECT, QUIZ_PASS, CERTIFICATE |

## Environment

Copy `.env.example` to `.env`. Key vars:

- `DATABASE_URL` — required, PostgreSQL connection string
- `NHOST_URL` — optional, Nhost PostgreSQL backup connection string
- `MYSQL_URL` — optional, MySQL connection string for backup
- `KEEPALIVE_INTERVAL_MS` — optional, keep-alive interval (default: 43200000 = 12h)
- `KEEPALIVE_FIRST_DELAY_MS` — optional, first keep-alive delay (default: 300000 = 5min)
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

- `pnpm build` must run `prisma generate` (PG + MySQL) before vite/tsc — the build script chains this automatically.
- `.htaccess` does nothing on nginx (production server). The nginx snippet in `deploy.sh` replaces its functionality.
- Vite dev server proxies `/api` to `https://localhost:3001` (note: `secure: false` for self-signed certs).
- `app.js` and `Passengerfile.json` exist for Phusion Passenger but are NOT used by `deploy.sh`.
- No `typecheck` command — run `npx tsc --noEmit` for frontend or check server with `npx tsc --project tsconfig.server.json --noEmit` if needed.
- Prisma migrations live in `prisma/migrations/`. Use `prisma migrate dev` to create new ones locally.
- MySQL client is generated to `prisma/generated/mysql/` — this path is in `.gitignore`.
- `prisma-mysql.ts` uses `path.resolve(__dirname, ...)` for dynamic require because compiled output (`dist/server/lib/`) is deeper than source (`server/lib/`).
- When `MYSQL_URL` is not set, `prismaMysql` is `null` and all dual-write operations silently skip MySQL.
- When `NHOST_URL` is not set, `prismaNhost` is `null` and all dual-write operations silently skip Nhost.
- `PG_URL_1` takes precedence over `DATABASE_URL` as primary. If neither is set, the server won't start.
- `prisma.ts` uses `PG_URL_1 || DATABASE_URL` for the primary client. The database registry (`server/config/databases.ts`) manages all connections.
- Health checks run every 60s in production. Disconnected databases get exponential backoff (30s → 5min).
- Background sync only runs when in production (`NODE_ENV=production`). It syncs from the database with the most data.
- The `authorize()` middleware supports both role-based (`authorize('ADMIN','GESTOR')`) and CASL ability-based (`authorize('create','User')`) patterns. Detects which by checking if first arg is a known CASL action.
