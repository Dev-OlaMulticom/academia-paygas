# Copilot Instructions — Academia PayGas

**Project:** Corporate LMS for PayGas employees. React SPA + Express API + PostgreSQL (primary) + MySQL (backup).

**Documentation hub:** `.ai/` directory. Key files:
- `.ai/AGENTS.md` — Complete agent guide (commands, architecture, roles, gotchas)
- `.ai/architecture.md` — Detailed project structure, database, auth, encryption, email
- `.ai/coding-rules.md` — Style, naming conventions, React/Express patterns, security
- `.ai/testing.md` — Verification commands and manual testing patterns
- `.ai/workflow.md` — 10-step development workflow

---

## Quick Start

### Pre-flight checks
```bash
pnpm --version          # Verify package manager
pnpm install            # Install dependencies
ls .env                 # Verify environment file (copy from .env.example if missing)
```

### Essential commands
```bash
pnpm dev                # Frontend (Vite :5173) + backend (tsx watch :3001) concurrently
pnpm build              # Compile both targets (runs prisma generate, vite build, tsc)
pnpm start              # Run built server (requires build first)
pnpm lint               # Check code with Biome
pnpm lint:fix           # Auto-fix Biome issues
pnpm format             # Format with Biome
pnpm test               # Run smoke tests (node --import tsx --test tests/*.test.ts)

# Typecheck (no dedicated script)
npx tsc --noEmit                                    # Frontend
npx tsc --project tsconfig.server.json --noEmit     # Backend
```

---

## Project Structure

**Single package, two compilation targets:**

| Target | Source | Output | Config |
|--------|--------|--------|--------|
| Frontend | `apps/web/src/` | `dist/` | `tsconfig.json` (ESNext, `noEmit: true`) |
| Backend | `apps/api/apps/web/src/server/` | `dist/apps/api/apps/web/src/server/` | `tsconfig.server.json` (CommonJS) |
| Shared | `packages/shared/src/shared/` | compiled by tsc | Used by both targets |

**Entry points:**
- Frontend: `apps/web/src/main.tsx` → `apps/web/src/App.tsx` (React Router, BrowserRouter)
- Backend: `apps/api/apps/web/src/server/index.ts` (Express on port 3001)

**Path aliases:**
- `@/*` → `./apps/web/src/*` (frontend only)
- `@packages/shared/src/shared/*` → `./packages/shared/src/shared/*` (both frontend and backend)

---

## Code Style & Linting

**Linter:** Biome (not ESLint). Config in `biome.json`.

**Style rules:**
- Indentation: **tabs** (not spaces)
- Quotes: **double quotes**
- Line width: 120 characters
- Trailing commas: **always**

**Examples:**
```tsx
// ✅ CORRECT
const user = { name: "João", role: "GESTOR" };

// ❌ WRONG
const user = { name: 'João', role: 'GESTOR' }
```

**Naming conventions:**
- UI strings: Portuguese (pt-BR)
- Database identifiers: Portuguese (`modulo`, `aula`, `licao`, `equipe`, `certificados`)
- Functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case`

---

## Database Architecture

**Multi-database setup with failover:**

```env
PG_URL_1="postgres://..."        # Primary (PostgreSQL, takes precedence)
PG_URL_2="postgres://..."        # Secondary (failover for reads)
PG_URL_3..10                      # Additional PostgreSQL backups (auto-discovered)
DATABASE_URL="..."                # Legacy fallback (required by Prisma migrations)
MYSQL_URL="..."                   # MySQL backup (third-tier, fire-and-forget writes)
```

**Key behaviors:**
- Reads failover to next healthy database if primary is down
- Writes go to all healthy databases in parallel
- Background sync reconciles empty databases when they recover
- Health checks run every 60s
- Keep-alive pings every 12h (prevents free-tier pauses)
- **Dev mode has NO failover** — only production (or with `DB_INFRA_DEV=1`)

**Data Access Layer (DAL):**

```ts
// ✅ ALWAYS use DAL
import { db } from '../lib/db'

await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.findMany('modulo', { where: { ativo: true } })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.delete('user', { id: '123' })

// ❌ NEVER call prisma directly
import { prisma } from '../lib/prisma'
await prisma.user.create({ data: { ... } })  // WRONG
```

**Important gotchas:**
- `db.transaction()` only uses primary client — no replication to backups
- Raw queries (`db.queryRaw()`) also only hit primary
- DAL is in `apps/api/apps/web/src/server/lib/db.ts`
- Models configured in `apps/api/apps/web/src/server/lib/db-models.ts`
- MySQL/Nhost gracefully degrade if env vars not set (logs warnings)

---

## Authentication & Authorization

**Auth:** JWT + bcryptjs. Tokens verified via `apps/api/apps/web/src/server/middleware/auth.ts`.

**Five roles:**
- `ADMIN` — Full system access
- `GESTOR` — Team manager (restricted to own team)
- `ATENDENTE` — Frontline employee
- `PARCEIRO_ACREDITADO` — Accredited partner
- `ERPS_REPRESENTANTE` — ERP system representative

**Authorization patterns:**

```ts
// Role-based (backward compatible)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred for new code)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User', JSON.stringify({ gestorId: req.userId })))
```

**Frontend permissions:**
```tsx
const { can, cannot, isAdmin, isGestor, isAtendente, isParceiro, isErps } = useAbility()
if (can('delete', 'User')) { /* show delete button */ }
```

**Key gotchas:**
- CASL actions defined in `packages/shared/src/shared/casl/actions.ts` (single source of truth)
- CASL conditions must be JSON.stringified in middleware
- Frontend CASL is custom (NOT `@casl/ability` runtime) — backend is always source of truth
- Permissions are DB-driven via `RoleConfig` table (runtime customization)

---

## React Patterns

**UI Components:**
- shadcn/ui (new-york style) from `apps/web/src/components/ui/`
- Radix UI primitives
- TailwindCSS 4
- Lucide icons

**Hooks:**
- `useAbility()` — Permission checks
- `apps/web/src/hooks/` — Custom hooks
- Avoid prop drilling where possible

**Example:**
```tsx
// ✅ Use shadcn/ui components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function UserCard({ user }: { user: User }) {
  const { can } = useAbility()
  return (
    <Card>
      <CardHeader>{user.nome}</CardHeader>
      <CardContent>
        {can('delete', 'User') && <Button onClick={...}>Delete</Button>}
      </CardContent>
    </Card>
  )
}
```

---

## Express API Routes

**All routes under `/api/`** in `apps/api/apps/web/src/server/routes/`:
`auth`, `usuarios`, `cms`, `certificates`, `notifications`, `progresso`, `dashboard`, `docs`, `analytics`, `forum`, `gamification`, `conquistas`, `public`, `modules`, `logs`, `xpconfig`, `import-export`, `adminDashboard`, `role-permissions`, `paygas-access`.

**Pattern:**
```ts
// ✅ CORRECT
import { authenticate, authorize } from '../middleware/auth'
import { db } from '../lib/db'

router.get('/users', authenticate, authorize('read', 'User'), async (req, res) => {
  const users = await db.findMany('user', { where: { ...filters } })
  res.json(users)
})

// ❌ WRONG
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({ ... })  // Direct prisma call
  res.json(users)
})
```

---

## Database Schema & Naming

**Naming gotcha:** Database table is `Modulo` but frontend/CMS calls it "Curso". This is cosmetic only.

| Database (Prisma) | UI / API / CMS | Notes |
|-------------------|----------------|-------|
| `Modulo` | **Curso** | Top-level learning unit |
| `Aula` | Aula / Lesson section | Sub-unit of Curso |
| `Licao` | Lição / Lesson content | Leaf unit (video, text, PDF) |
| `autoCertificado` | "Certificado automático" | Boolean feature flag per Curso |
| `nivel` (User) | "Nível" | Derived `Math.floor(xp/2000)+1` |
| `xp` (Float) | Pontos / XP | Configurable via `XPConfig` |

**When in doubt, use the DB model name as the canonical identity.**

---

## Security Rules

### Never do
- Expose secrets or tokens in code
- Disable authentication middleware
- Modify security policies without review
- Validate input on client only
- Use concatenated SQL (use Prisma)

### Always do
- Validate all user input
- Use parameterized queries (Prisma)
- Implement rate limiting when appropriate
- Sanitize user data
- Use HTTPS in production

---

## Testing

**Unit & Smoke Tests:**

**Test runner:** Node.js built-in test runner + tsx loader (no Jest/Vitest).

```bash
pnpm test    # Runs tests/*.test.ts
```

**Coverage:**
| File | Covers |
|------|--------|
| `tests/casl-shared.test.ts` | Shared CASL constants consistency |
| `tests/jwt-fallback.test.ts` | JWT_SECRET fallback chain |
| `tests/encryption.test.ts` | Encryption round-trip |

**End-to-End Testing (Playwright):**

The project uses **Playwright MCP** for e2e testing the React frontend:

```bash
# Before running e2e tests, ensure dev server is running
pnpm dev    # Terminal 1: Starts both Vite (:5173) and Express (:3001)

# In another terminal, use Playwright MCP to write/run tests
# Example: Test user login flow
@playwright.test("login flow", async ({ page, context }) => {
  await page.goto('http://localhost:5173/login')
  await page.fill('input[type="email"]', 'admin@paygas.com.br')
  await page.fill('input[type="password"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForNavigation()
  expect(page.url()).toContain('/dashboard')
})
```

Use Playwright MCP to:
- Record user interactions and generate test code
- Run tests against the local dev environment
- Verify UI flows, form validation, navigation, permissions

**Manual verification pattern:**
```bash
pnpm build                              # Build both targets
pnpm start                              # Start server
curl http://localhost:3001/api/health   # Test health endpoint
```

**Seed data (test users):**
```bash
pnpm db:seed      # Creates test users
pnpm db:reset     # Reset + seed
```

Test users:
- `admin@paygas.com.br` / ADMIN / `123456`
- `gestor@paygas.com.br` / GESTOR / `123456`
- `atendente@paygas.com.br` / ATENDENTE / `123456`

---

## Build & Deployment

**Build process:**
```bash
pnpm build
```

This script runs (in order):
1. `npx prisma generate` (PostgreSQL client)
2. `npx prisma generate --schema=packages/db/prisma/schema.mysql.prisma` (MySQL client)
3. `npx vite build` (frontend) + `npx tsc --project tsconfig.server.json` (backend) concurrently

**Why prisma generate first?** TypeScript compilation needs Prisma types (e.g., `User`, `Modulo`).

**Important gotcha:**
- `tsconfig.server.json` uses `rootDir: "./"` with `outDir: "./dist"`
- This means `apps/api/apps/web/src/server/index.ts` → `dist/apps/api/apps/web/src/server/index.js` and `packages/shared/src/shared/casl/actions.ts` → `dist/packages/shared/src/shared/casl/actions.js`
- DO NOT change `outDir` to `"./dist/server"` — it would produce `dist/apps/api/apps/web/src/server/apps/api/apps/web/src/server/index.js` (double nesting)

**Deployment:**
```bash
./deploy.sh    # Auto-detects nginx, builds, restarts
```

Production runs `node dist/apps/api/apps/web/src/server/index.js` directly (not Passenger).

---

## Other Key Infrastructure

### Encryption
- AES-256-GCM between client and server
- Client fetches key from `GET /api/config` (requires auth token) before login
- Client: `apps/web/src/lib/crypto.ts` | Server: `apps/api/apps/web/src/server/middleware/encryption.ts`

### Email Service
- Centralized via `apps/api/apps/web/src/server/services/email.ts`
- Primary: Gmail SMTP | Backup: Resend SMTP (auto-fallback)
- Every email BCCs `email@academia.paygas.com.br`
- Returns `{ success, messageId, error }`

### Gamification / XP
- XP configurable via `XPConfig` table (editable by ADMIN)
- Level = `Math.floor(xp / 2000) + 1`
- `awardPoints` in `apps/api/apps/web/src/server/services/gamification.ts` with 60s cache

### Activity Logs
- All user actions logged via `logActivity(userId, acao, detalhes)` in `apps/api/apps/web/src/server/services/log.ts`
- ADMIN views logs at `/logs` with filters by user, action type, date range

---

## Common Gotchas

- **Biome excludes:** `dist/`, `node_modules/`, `*.js`, `wordpress-plugin-academia-paygas/`, `api/`, `styles/`. These are intentional.
- **Vite dev proxy:** `/api` proxies to `http://localhost:3001` (not https)
- **HTTPS auto-detection:** Server looks for `apps/api/apps/web/src/server/certs/key.pem` and `cert.pem`
- **JWT_SECRET fallback:** env var (≥32 chars) → `.jwt-secret` file (≥16 chars) → auto-generate 64-byte hex and persist
- **`prisma.config.ts`** auto-detects `--schema` arg to pick PG vs MySQL URL
- **`.htaccess` does nothing on nginx** — the nginx snippet in `deploy.sh` replaces its functionality
- **Two PrismaClient instances** for PG_URL_1: both share the same pool via `getPrimaryPrisma()` after health check invalidation
- **Prisma uses PrismaPg adapter** (`@packages/db/prisma/adapter-pg`), not the default binary engine
- **MySQL uses MariaDB adapter** (`@packages/db/prisma/adapter-mariadb`)
- **MySQL client generated to `packages/db/prisma/generated/mysql/`** (in `.gitignore`)

---

## When to Consult Documentation

| Question | Where to look |
|----------|------------------|
| "What's the high-level architecture?" | `.ai/architecture.md` |
| "How does multi-database failover work?" | `.ai/architecture.md` (Database section) |
| "What are CASL actions?" | `.ai/AGENTS.md` (Roles & Permissions section) |
| "How do I add a new backend route?" | `.ai/AGENTS.md` (Backend routes section) |
| "What's the coding style?" | `.ai/coding-rules.md` + `biome.json` |
| "How do I verify my changes?" | `.ai/testing.md` |
| "What's the development workflow?" | `.ai/workflow.md` |
| "How do I use codebase-memory-mcp?" | `.ai/memory.md` |
| "How do I deploy?" | `.ai/AGENTS.md` (Deploy section) + `.ai/DEPLOY-CPANEL.md` |

---

## Development Workflow

1. **Understand the objective** — Read the request, identify the goal, ask clarifications if ambiguous
2. **Consult codebase memory** — Use `codebase-memory-mcp` for architecture and patterns
3. **Search for related code** — Use `rg` (text), `fd` (files), `ast-grep` (refactoring), LSP (symbols)
4. **Analyze impact** — Will this break backward compatibility? Introduce security issues? Require DB migration?
5. **Implement** — Follow conventions, use existing patterns, update docs
6. **Verify** — Typecheck, lint, build, test (if applicable)
7. **Commit** — Follow format: `tipo: descripcion` (feat, fix, security, docs, chore, deploy)

---

## Commit Message Format

```
type: description

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Types:** `feat`, `fix`, `security`, `docs`, `chore`, `deploy`

**Example:**
```
feat: add role-based permission checks to dashboard

- Implement useAbility() hook for permission guards
- Add role-specific dashboard sections
- Update role-permissions API endpoint

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```
