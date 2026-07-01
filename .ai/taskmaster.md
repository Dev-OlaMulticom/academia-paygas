# Task Master AI

Task list lives in `.taskmaster/tasks/tasks.json`. Individual task files in `.taskmaster/tasks/`.

## Workflow

```
1. Parse PRD → task-master parse-prd .taskmaster/docs/prd.md
2. Expand tasks → task-master expand --all
3. Pick next → npx task-master next
4. Work on it → npx task-master set-status --id=<id> --status=in-progress
5. Done → npx task-master set-status --id=<id> --status=done
```

## Useful commands

```bash
npx task-master list              # show all tasks
npx task-master next              # next available task
npx task-master show <id>         # task details
npx task-master add-task --title="..." --description="..." --priority=<high|medium|low>
npx task-master set-status --id=<id> --status=done
npx task-master expand --id=<id>  # break into subtasks
```

## Task priorities

- **high**: Critical bugs, security issues, blocking features
- **medium**: New features, improvements, non-blocking fixes
- **low**: Nice-to-haves, optimizations, documentation

## Status values

- `pending` - Not started
- `in-progress` - Currently being worked on
- `done` - Completed
- `blocked` - Blocked by another task or issue

## AI features

AI features (parse-prd, expand, add-task with --prompt) require API keys in `.env`:
- `ANTHROPIC_API_KEY` (recommended) or `OPENAI_API_KEY` or `GOOGLE_API_KEY`
- `PERPLEXITY_API_KEY` (optional, for research mode)
