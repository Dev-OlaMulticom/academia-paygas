# Academia PayGas Development Skill

Skill específico para el flujo de desarrollo de Academia PayGas.

## Cuándo usar este skill

Usar este skill cuando:

- Necesitas crear una nueva ruta Express
- Necesitas crear un nuevo componente React
- Necesitas agregar una nueva tabla a la base de datos
- Necesitas implementar una nueva feature de gamificación
- Necesitas trabajar con el sistema de permisos CASL
- Necesitas crear una nueva migration de Prisma

## Funcionalidades

### Crear nueva ruta Express

```bash
devin skill invoke academia-paygas-dev create-route --name="nombre-ruta" --methods="GET,POST"
```

Crea una nueva ruta en `apps/api/apps/web/src/server/routes/` con:
- Middleware de authentication
- Error handling estándar
- Logging con Pino
- Estructura recomendada

### Crear nuevo componente React

```bash
devin skill invoke academia-paygas-dev create-component --name="NombreComponente" --type="page|ui"
```

Crea un nuevo componente en:
- `apps/web/src/pages/` si es type="page"
- `apps/web/src/components/ui/` si es type="ui"

Con:
- Estructura estándar
- TypeScript types
- Props interface
- shadcn/ui patterns si es UI component

### Crear migration de Prisma

```bash
devin skill invoke academia-paygas-dev create-migration --name="descripcion"
```

Crea una nueva migration en `packages/db/prisma/migrations/` con:
- Nombre timestamped
- SQL o Prisma migration format
- Instrucciones para aplicar

### Agregar configuración de XP

```bash
devin skill invoke academia-paygas-dev add-xp-config --action="ACTION_NAME" --points=50
```

Agrega o actualiza configuración de XP en:
- Base de datos (tabla XPConfig)
- Service de gamificación
- Cache invalidation

## Patrones aplicados

Este skill aplica los patrones documentados en `.devin/patterns.md`:

- Route Pattern
- Component Pattern
- DAL CRUD Pattern
- XP Award Pattern
- Activity Log Pattern

## Integración con codebase-memory-mcp

Este skill usa codebase-memory-mcp para:

- Buscar patrones existentes antes de crear código
- Verificar que no haya duplicados
- Registrar nuevos patrones creados
- Actualizar memoria del proyecto

## Integración con Task Master AI

Este skill puede:

- Crear tareas automáticamente para trabajo complejo
- Actualizar estado de tareas existentes
- Registrar progreso en Task Master

## Verificación

Este skill ejecuta automáticamente:

```bash
pnpm lint
npx tsc --noEmit
npx tsc --project tsconfig.server.json --noEmit
pnpm build
```

Y solicita verificación manual si aplica.

## Ejemplos de uso

### Crear ruta para gestionar conquistas

```bash
devin skill invoke academia-paygas-dev create-route \
  --name="conquistas" \
  --methods="GET,POST,PUT,DELETE" \
  --auth="required" \
  --authorization="ADMIN"
```

Resultado:
- Crea `apps/api/apps/web/src/server/routes/conquistas.ts`
- Agrega registro en `apps/api/apps/web/src/server/index.ts`
- Aplica patrones de Route Pattern
- Verifica lint y typecheck

### Crear página de dashboard de usuario

```bash
devin skill invoke academia-paygas-dev create-component \
  --name="UserDashboardPage" \
  --type="page" \
  --route="/dashboard"
```

Resultado:
- Crea `apps/web/src/pages/UserDashboardPage.tsx`
- Agrega ruta en `apps/web/src/App.tsx`
- Aplica patrones de Component Pattern
- Usa componentes shadcn/ui

### Agregar configuración de XP para nuevo quiz

```bash
devin skill invoke academia-paygas-dev add-xp-config \
  --action="QUIZ_SCIENCE_PASS" \
  --points=150 \
  --description="Completar quiz de ciencias con nota > 80%"
```

Resultado:
- Inserta en tabla XPConfig
- Invalida cache en gamification service
- Verifica que service use nueva config

## Limitaciones

Este skill no:

- Reemplaza pensamiento crítico del agente
- Automatiza todo el proceso de desarrollo
- Elimina necesidad de verificación manual
- Reemplaza el workflow estándar

Es una herramienta para acelerar tareas repetitivas siguiendo patrones establecidos.

## Mantenimiento

Para actualizar este skill:

1. Editar este archivo `.devin/skills/academia-paygas-dev/SKILL.md`
2. Actualizar patrones si cambian en `.devin/patterns.md`
3. Verificar integración con codebase-memory-mcp
4. Probar skill con casos de uso reales
