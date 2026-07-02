# Coding Rules — Políticas del Agente

## Pre-flight Checks

Antes de comenzar cualquier tarea, verificar:

```bash
pnpm --version
pnpm install
ls .env
```

### Herramientas CLI

```bash
rg --version
fd --version
npx tsc --version
npx prisma --version
```

## Estándares de código

### Linter

- **Herramienta**: Biome (configurado en `biome.json`)
- **Tabs vs Spaces**: Tabs
- **Quotes**: Double quotes
- **Trailing commas**: Yes
- **Line width**: 120 caracteres

### Conventions de nombres

- **UI strings**: Portugués (pt-BR)
- **Identificadores**: Portugués (`curso`, `aula`, `licao`, `equipe`, `certificados`)
- **Funciones**: camelCase
- **Componentes**: PascalCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: kebab-case

### Patrones de React

- Usar componentes de `src/components/ui/` (shadcn/ui)
- Seguir patrones existentes en `src/pages/`
- Usar hooks personalizados de `src/hooks/`
- Evitar props drilling cuando sea posible

### Patrones de Express

- Todas las rutas bajo `/api/`
- Archivos de rutas en `server/routes/`
- Usar middleware de `server/middleware/`
- Nunca llamar `prisma.*` directamente en rutas (usar `server/lib/db.ts`)

## Base de datos

### Reglas de oro

1. **Nunca llamar prisma directamente en rutas**: Usar `server/lib/db.ts`
2. **Migrations requeridas**: Cualquier cambio de schema requiere migration
3. **Multi-database**: Considerar backup databases en writes
4. **DAL abstraction**: Usar `db.create()`, `db.findUnique()`, etc.

### Ejemplo correcto:

```typescript
// ✅ CORRECTO - usando DAL
import { db } from '../lib/db'

await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
```

### Ejemplo incorrecto:

```typescript
// ❌ INCORRECTO - prisma directo
import { prisma } from '../lib/prisma'

await prisma.user.create({ data: { email, nome, senha } })
```

## Seguridad

### Nunca hacer

- Exponer secrets o tokens en código
- Desactivar middleware de autenticación
- Modificar políticas de seguridad
- Validar input en cliente solamente
- Usar SQL concatenado (usar Prisma)

### Siempre hacer

- Validar todas las entradas de usuario
- Usar consultas parametrizadas (Prisma)
- Implementar rate limiting cuando apropiado
- Sanitizar datos de usuario
- Usar HTTPS en producción

## Anti-patterns

### Evitar

- Código duplicado (DRY - Don't Repeat Yourself)
- Reinventar ruedas (reutilizar componentes existentes)
- Premature optimization (hacerlo simple primero)
- Over-engineering (soluciones simples cuando sea posible)
- Hardcoding (usar configuración/database cuando apropiado)
- Ignorar tipos (TypeScript es tu amigo)
- Comments obvios (el código debe hablar por sí mismo)

## Depuración

### Estrategia

1. **Reproducir el problema** de forma confiable
2. **Trazar el flujo** de ejecución
3. **Agregar logging** temporal para aislar el issue
4. **Identificar la causa raíz** antes de arreglar
5. **Verificar el fix** realmente resuelve el problema
6. **Limpiar logging** temporal antes de commit

### Herramientas

- **Backend**: Logger Pino (configurado en `server/lib/logger.ts`)
- **Frontend**: Console.log (dev) + DevTools
- **Database**: Prisma Studio o queries directas
- **Network**: DevTools Network tab

## Comunicación

### Estilo

- **Conciso**: Ir al punto
- **Directo**: No rodeos
- **Honesto**: Admitir cuando no sé algo
- **Proactivo**: Sugerir mejorías cuando sea apropiado

### Cuándo preguntar

- Cuando los requisitos son ambiguos
- Cuando hay múltiples soluciones válidas
- Cuando el impacto es significativo
- Cuando hay riesgo de breaking changes
- Cuando no estoy seguro de la mejor aproximación
