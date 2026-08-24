# Contributing

## Development setup

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Branching

- `main` → producción
- Feature branches: `feat/<name>`, `fix/<name>`, `chore/<name>`
- PR obligatorio con CI verde

## Commit messages

Conventional Commits:
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `chore:` tareas internas
- `refactor:` refactorización
- `docs:` documentación
- `ci:` cambios CI

Ej: `feat(api): add rate limit middleware`

## Code style

- Biome para lint/format: `pnpm lint` / `pnpm lint:fix`
- TypeScript estricto
- Tests en `apps/api/tests`
- Sin secretos en código. Usar env vars

## PR checklist

- [ ] Tests pasan `pnpm test`
- [ ] Lint pasa `pnpm lint`
- [ ] `pnpm audit --audit-level high` sin vulnerabilidades críticas
- [ ] README actualizado si cambia API
- [ ] Documentación en `.ai/` actualizada

## Release

CI en GitHub Actions ejecuta audit, tests y lint en cada PR a main.
