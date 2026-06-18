# Academia PayGas

LMS (Learning Management System) for PayGas — a Portuguese platform for training, certification, and gamification of field teams across Brazil.

## Run & Operate

- API server runs on port 8080 (workflow: `artifacts/api-server: API Server`)
- Frontend Vite dev server runs on port 24320 (workflow: `artifacts/academia-paygas: web`)
- `pnpm --filter @workspace/api-server run dev` — build + start API server
- Required env: `DATABASE_URL` — Postgres connection string (auto-set by Replit DB)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + react-router-dom v7
- API: Express 5 + Prisma v7 (with `@prisma/adapter-pg`)
- DB: PostgreSQL (tables managed via `artifacts/api-server/prisma/schema.prisma`)
- Auth: JWT (bcryptjs + jsonwebtoken), stored in localStorage
- Encryption: AES-256-GCM end-to-end between client and server
- Offline: Dexie (IndexedDB) + sync queue
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/academia-paygas/` — React+Vite frontend
  - `src/pages/` — all page components (Dashboard, Modulos, CMS, Usuarios, etc.)
  - `src/lib/api.ts` — ApiClient class (all fetch calls, encryption, caching)
  - `src/lib/crypto.ts` — Web Crypto AES-256-GCM encryption
  - `src/lib/db.ts` — Dexie IndexedDB schema
  - `src/index.css` — full custom CSS (no Tailwind components used in main UI)
- `artifacts/api-server/` — Express API server
  - `src/routes/` — all route modules (auth, usuarios, cms, progresso, certificates, notifications, dashboard)
  - `src/middleware/auth.ts` — JWT auth + authorize middleware
  - `src/middleware/encryption.ts` — AES-256-GCM request/response encryption
  - `src/services/gamification.ts` — XP/points award logic
  - `src/lib/prisma.ts` — Prisma client using `@prisma/adapter-pg`
  - `prisma/schema.prisma` — DB schema (Prisma v7 format — no `url` in datasource)
  - `prisma.config.ts` — Prisma v7 config with adapter (required for `db push`)

## Architecture decisions

- **Prisma v7 (not Drizzle)**: Original app used Prisma; v7 requires `prisma.config.ts` with adapter and the schema.prisma datasource block must NOT have a `url` property — connection comes from the adapter in `prisma.ts`.
- **DB schema via raw SQL**: Prisma v7 `db push` requires config changes; initial table creation done via raw SQL (`node --input-type=module` script with `pg` client).
- **Double route mounting** (`/cms` and `/modulos`): The frontend api.ts calls both `/cms/*` and `/modulos/*` prefixes for the same CMS resource, so both are mounted on `cmsRouter`.
- **Encryption key at `/api/config`**: Frontend fetches encryption key from this public endpoint on startup; the key is generated per-server-instance if `ENCRYPTION_KEY` env var is not set.
- **Email stubbed**: SMTP email sends are stubbed (console.log only) — configure SMTP_HOST/PORT/USER/PASS to enable real email.

## Product

- **Roles**: ADMIN, GESTOR, ATENDENTE — role-based access throughout
- **Modules & Lessons**: Video/PDF/text lessons with progress tracking
- **Quizzes**: Auto-graded with XP awards on pass; auto-certificate generation
- **Certificates**: PENDING → APPROVED → ISSUED workflow
- **Gamification**: XP points per action (login, lesson complete, quiz pass, module complete, certificate), leaderboard, levels
- **Notifications**: Send to individual, team, role, or all users
- **Offline support**: Dexie cache + sync queue for offline-first UX

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Prisma v7 schema.prisma must NOT have `url` in the datasource block — this causes a validation error. Connection URL is injected via the adapter in `prisma.config.ts` and `src/lib/prisma.ts`.
- To push schema changes: `cd artifacts/api-server && pnpm exec prisma db push --config prisma.config.ts`
- To generate Prisma client: `cd artifacts/api-server && pnpm exec prisma generate --config prisma.config.ts`
- The `@types/bcryptjs` package shows a deprecation warning — bcryptjs now ships its own types; this is harmless.
- Seed admin user: `admin@paygas.com.br` / `admin123`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Migration backup at `.migration-backup/` — original Vercel app source preserved
