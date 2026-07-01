# Testing — Verificación del Proyecto

## Comandos de verificación

```bash
# Lint
pnpm lint

# Typecheck frontend
npx tsc --noEmit

# Typecheck backend
npx tsc --project tsconfig.server.json --noEmit

# Build
pnpm build

# Database
npx prisma migrate deploy
```

## Manual Verification Pattern

No hay test framework. Verificación manual via API health check y seed data.

```bash
# 1. Build
pnpm build

# 2. Start server
pnpm start

# 3. Test API
curl http://localhost:3001/api/health

# 4. Test specific endpoint
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/usuarios
```

## Seed data

```bash
pnpm db:seed    # Crea usuarios de prueba
pnpm db:reset   # Reset + seed
```

### Usuarios de prueba

| Email | Rol | Password |
|-------|-----|----------|
| admin@paygas.com.br | ADMIN | 123456 |
| gestor@paygas.com.br | GESTOR | 123456 |
| atendente@paygas.com.br | ATENDENTE | 123456 |
| joao@paygas.com.br | ATENDENTE | 123456 |
| maria@paygas.com.br | ATENDENTE | 123456 |

## Criterios de completitud

Una tarea solo se considera completa cuando:

- ✅ El código compila sin errores
- ✅ Los tests pasan (si existen)
- ✅ El lint no tiene errores (warnings aceptables)
- ✅ Typecheck pasa sin errores
- ✅ Build funciona
- ✅ Documentation actualizada

## CI/CD Pipeline

No hay pipeline CI/CD configurado. Deploy manual via `./deploy.sh`.

## Próximas mejoras

- Implementar test framework (Jest/Vitest)
- Agregar failover en dev mode
- Configurar CI/CD pipeline
