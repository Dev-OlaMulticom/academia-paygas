# AGENTS.md — Academia PayGas

> **Centralized documentation:** All agent documentation lives in `.ai/`.

## Documentation Index

| Document | Location | Description |
|----------|----------|-------------|
| Architecture | [`../.ai/architecture.md`](../.ai/architecture.md) | Project structure, database, auth, deployment, gotchas |
| Coding Rules | [`../.ai/coding-rules.md`](../.ai/coding-rules.md) | Style conventions, security rules, anti-patterns |
| Workflow | [`../.ai/workflow.md`](../.ai/workflow.md) | 10-step development workflow, error handling, scenarios |
| Task Master | [`../.ai/taskmaster.md`](../.ai/taskmaster.md) | Task management with Task Master AI |
| Memory | [`../.ai/memory.md`](../.ai/memory.md) | codebase-memory-mcp usage, priority, best practices |
| Testing | [`../.ai/testing.md`](../.ai/testing.md) | Verification commands, manual testing, seed data |

## Quick Reference

### Commands

```bash
pnpm dev              # Dev (frontend + backend)
pnpm build            # Build (prisma + vite + tsc)
pnpm lint             # Lint (biome check)
pnpm lint:fix         # Lint fix
npx tsc --noEmit      # Typecheck frontend
npx tsc --project tsconfig.server.json --noEmit  # Typecheck backend
```

### Codebase Tools

- `rg` for text search (never `grep`)
- `fd` for file search (never `find`)
- `ast-grep` for refactoring
- `LSP` for symbol navigation
- `codebase-memory-mcp` for code discovery

### Key Gotchas

- **DAL**: Always use `server/lib/db.ts`, never `prisma.*` directly in routes
- **CASL**: Backend is source of truth; frontend CASL is custom UI hints only
- **Multi-DB**: `db.transaction()` only uses primary, no replication to backups
- **Dev mode**: No failover, no health checks, no background sync
