# .ai/ — Centralized Agent Documentation

This directory contains all agent documentation for the Academia PayGas project. It serves as the single source of truth referenced by `.opencode/AGENTS.md` and `.devin/instructions.md`.

## Documents

| File | Description |
|------|-------------|
| [architecture.md](architecture.md) | Project structure, database, auth, encryption, email, gamification, deployment, gotchas |
| [coding-rules.md](coding-rules.md) | Style conventions (Biome), naming rules, React/Express patterns, security, anti-patterns |
| [workflow.md](workflow.md) | 10-step development workflow: understand → search → plan → implement → verify → commit |
| [taskmaster.md](taskmaster.md) | Task Master AI commands, priorities, status values, workflow |
| [memory.md](memory.md) | codebase-memory-mcp usage: search_graph, trace_path, get_code_snippet, query_graph, best practices |
| [testing.md](testing.md) | Verification commands, manual testing patterns, seed data, completeness criteria |

## References

- **`.opencode/AGENTS.md`** → links to `../.ai/`
- **`.devin/instructions.md`** → header references `../.ai/`
- **Root `AGENTS.md`** → links to `ai/` (relative paths)

## How to Use

Each agent reads the documents it needs from this directory. The main entry point is `architecture.md` for project context, and `coding-rules.md` for style conventions.

When updating documentation, edit the file in this `.ai/` directory — the references from `.opencode/` and `.devin/` will automatically point to the latest version.
