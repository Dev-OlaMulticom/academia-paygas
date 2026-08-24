# Academia PayGas — Project Documentation

**Corporate LMS platform for PayGas gas station employees.**

Quick specs:
- **Tech Stack:** React 19 + Express 5 + PostgreSQL + TailwindCSS 4
- **Deployment:** cPanel with nginx reverse proxy
- **Package Manager:** pnpm
- **Database:** Multi-PG failover (PG_URL_1/2/3...) + MySQL backup
- **Auth:** JWT + bcryptjs, 5 roles (ADMIN, GESTOR, ATENDENTE, PARCEIRO_ACREDITADO, ERPS_REPRESENTANTE)

---

## Quick Start (5 min)

```bash
# 1. Install & setup
pnpm install
cp .env.example .env           # Configure database URLs

# 2. Dev mode (both frontend + backend)
pnpm dev                       # Frontend :5173, Backend :3001

# 3. Verify health
curl http://localhost:3001/api/health
```

**Login with seed data:**
- Email: `admin@paygas.com.br` | Password: `123456`
- Email: `gestor@paygas.com.br` | Password: `123456`
- Email: `atendente@paygas.com.br` | Password: `123456`

---

## Key Features

| Feature | Status | Docs |
|---------|--------|------|
| **Multi-Database Failover** | ✅ | [architecture.md #Database](architecture.md#database) |
| **JWT + CASL Permissions** | ✅ | [AGENTS.md #Auth](AGENTS.md#authentication--authorization) |
| **AES-256-GCM Encryption** | ✅ | [architecture.md #Encryption](architecture.md#encryption) |
| **Gamification (XP/Levels)** | ✅ | [AGENTS.md #Gamification](AGENTS.md#gamification) |
| **Email (Gmail + Resend)** | ✅ | [architecture.md #Email](architecture.md#email) |
| **Activity Logging** | ✅ | [AGENTS.md #Activity Logs](AGENTS.md#activity-logs) |
| **Certificates** | ✅ | `apps/api/apps/web/src/server/routes/certificates` |
| **Forums** | ✅ | `apps/api/apps/web/src/server/routes/forum` |
| **Analytics Dashboard** | ✅ | `apps/api/apps/web/src/server/routes/analytics` |

---

## Essential Commands

```bash
# Development
pnpm dev              # Frontend + backend concurrently
pnpm lint             # Biome linter
pnpm format           # Code formatting

# Build
pnpm build            # Production build (both targets)
pnpm start            # Run production server

# Database
pnpm db:seed          # Create test users
pnpm db:reset         # Reset + seed
npx prisma migrate dev --name "add_column"  # Create migration

# Testing
pnpm test             # Run smoke tests
npx tsc --noEmit      # Frontend typecheck
npx tsc --project tsconfig.server.json --noEmit  # Backend typecheck
```

---

## Documentation by Purpose

### I want to...

| Goal | Document |
|------|----------|
| **Understand the project architecture** | [architecture.md](architecture.md) |
| **Build a new feature** | [workflow.md](workflow.md) → [AGENTS.md](AGENTS.md) |
| **Follow coding conventions** | [coding-rules.md](coding-rules.md) |
| **Implement permissions/roles** | [AGENTS.md #Roles](AGENTS.md#roles--permissions) |
| **Deploy to production (cPanel)** | [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md) |
| **Deploy to production (Vercel + Cloudflare)** | [DEPLOY-VERCEL-CLOUDFLARE.md](DEPLOY-VERCEL-CLOUDFLARE.md) |
| **Design UI components** | [DESIGN.md](DESIGN.md) |
| **Test changes** | [testing.md](testing.md) |
| **Use codebase-memory-mcp** | [memory.md](memory.md) |
| **Manage tasks** | [taskmaster.md](taskmaster.md) |

---

## Directory Structure

```
academia-paygas/
├── .ai/                    ← You are here (agent documentation)
│   ├── AGENTS.md           ← Agent commands, architecture, roles
│   ├── architecture.md     ← DB, auth, encryption, gamification
│   ├── coding-rules.md     ← Style, naming, security
│   ├── workflow.md         ← 10-step development workflow
│   ├── testing.md          ← Verification & manual testing
│   ├── taskmaster.md       ← Task Master AI guide
│   ├── memory.md           ← codebase-memory-mcp usage
│   ├── DESIGN.md           ← UI design system
│   ├── DEPLOY-CPANEL.md    ← Production deployment (cPanel)
│   ├── DEPLOY-VERCEL-CLOUDFLARE.md ← Production deployment (Vercel + Cloudflare)
│   └── SECURITY_CHANGES.md ← Security fixes & history
│
├── apps/web/src/                    ← Frontend (React)
│   ├── components/         ← React components + shadcn/ui
│   ├── pages/              ← Page components
│   ├── hooks/              ← Custom hooks
│   ├── lib/                ← Frontend utilities
│   └── main.tsx            ← Entry point
│
├── apps/api/apps/web/src/server/                 ← Backend (Express)
│   ├── routes/             ← API routes
│   ├── middleware/         ← Auth, encryption, logging
│   ├── services/           ← Business logic
│   ├── lib/                ← Database, logging
│   ├── auth/               ← CASL permissions
│   └── index.ts            ← Entry point
│
├── packages/shared/src/shared/                 ← Shared code (frontend + backend)
│   └── casl/               ← CASL action definitions
│
├── packages/db/prisma/                 ← Database schema
│   ├── schema.prisma       ← PostgreSQL schema
│   ├── schema.mysql.prisma ← MySQL schema
│   ├── migrations/         ← Migration files
│   └── seed.ts             ← Seed data
│
├── tests/                  ← Test files
└── package.json            ← Dependencies
```

---

## Important Gotchas

1. **DB access:** NEVER call `prisma.*` directly in routes. Use `apps/api/apps/web/src/server/lib/db.ts` (DAL).
2. **Naming:** DB table is `Curso` but frontend calls it "Curso" — cosmetic only.
3. **Dev mode:** No database failover in dev (only production). Enable with `DB_INFRA_DEV=1`.
4. **TypeScript config:** `tsconfig.server.json` uses `outDir: "./dist"` (not `./dist/server`) — do NOT change this.
5. **CASL permissions:** Must be JSON.stringified when passed to `authorize()` middleware.
6. **Build order:** `prisma generate` must run BEFORE `vite build` and `tsc` (already automated in `pnpm build`).

---

## How This Documentation Works

- **`.ai/`** — Central hub for agent documentation (this directory)
- **`.opencode/AGENTS.md`** — Links to `.ai/AGENTS.md`
- **`.devin/instructions.md`** — Links to `.ai/` docs
- **`.github/copilot-instructions.md`** — Quick reference for GitHub Copilot

When you update files in `.ai/`, all agents automatically reference the latest versions.

---

## Support & Resources

- **Architecture deep dive:** See [architecture.md](architecture.md)
- **Security issues:** See [SECURITY_CHANGES.md](SECURITY_CHANGES.md)
- **API endpoints:** See `apps/api/apps/web/src/server/routes/` folder
- **UI components:** See `apps/web/src/components/ui/` (shadcn/ui)
- **Design tokens:** See [DESIGN.md](DESIGN.md)
