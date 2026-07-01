# AGENTS.md — Academia PayGas

> **Full documentation:** [`../AGENTS.md`](../AGENTS.md)

## Quick Reference

### Commands

```bash
pnpm dev              # frontend + backend concurrently
pnpm build            # prisma generate → vite build + tsc server
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
pnpm test             # node --import tsx --test tests/*.test.ts
npx tsc --noEmit      # typecheck frontend
npx tsc --project tsconfig.server.json --noEmit  # typecheck backend
```

### Key Rules

- **DAL**: Always use `server/lib/db.ts`, never `prisma.*` directly in routes
- **CASL**: Backend is source of truth; frontend CASL is custom UI hints only
- **CASL conditions**: Must be JSON.stringified as third arg to `authorize()`
- **Multi-DB**: `db.transaction()` only uses primary, no replication to backups
- **Dev mode**: No failover, no health checks, no background sync
- **Biome**: Tabs, double quotes, trailing commas, lineWidth 120

### Codebase Tools

- `codebase-memory-mcp` — PRIMARY code discovery (search_graph, trace_path, get_code_snippet, query_graph)
- `rg` for text search (never `grep`)
- `fd` for file search (never `find`)
- `ast-grep` for refactoring
- `LSP` for symbol navigation

### Task Management

- `task-master-ai` — task list in `.taskmaster/tasks/tasks.json`
- `npx task-master next` / `list` / `show <id>` / `set-status --id=<id> --status=done`

### Documentation

| Document | Location |
|----------|----------|
| Architecture | [`../.ai/architecture.md`](../.ai/architecture.md) |
| Coding Rules | [`../.ai/coding-rules.md`](../.ai/coding-rules.md) |
| Workflow | [`../.ai/workflow.md`](../.ai/workflow.md) |
| Task Master | [`../.ai/taskmaster.md`](../.ai/taskmaster.md) |
| Memory | [`../.ai/memory.md`](../.ai/memory.md) |
| Testing | [`../.ai/testing.md`](../.ai/testing.md) |
