# Project Context — Academia PayGas

## 🎯 Visión del proyecto

Academia PayGas es un LMS (Learning Management System) corporativo para empleados de estaciones de servicio PayGas. Permite la capacitación en áreas como atención al cliente, seguridad, y procedimientos operativos.

## 🏗️ Arquitectura de alto nivel

### Monorepo single-package

No es un monorepo tradicional. Es un solo paquete con dos targets de compilación:

```
academia-paygas/
├── src/              → Frontend (Vite, React 19) → dist/
├── server/           → Backend (TSC, Express 5) → dist/server/
├── prisma/           → Database schemas & migrations
└── public/           → Static assets
```

### Flujo de datos

```
Frontend (React SPA)
    ↓ HTTP/HTTPS
Backend (Express API)
    ↓ Prisma ORM
PostgreSQL (Primary) ←→ MySQL (Backup)
```

### Comunicación cliente-servidor

- **Protocolo**: HTTP/HTTPS
- **Encryption**: AES-256-GCM para payloads POST/PUT/PATCH
- **Authentication**: JWT tokens (24h validity)
- **Formato**: JSON

## 🔐 Seguridad

### Encryption

- **Cliente**: `src/lib/crypto.ts` - Obtiene key de `GET /api/config`
- **Servidor**: `server/middleware/encryption.ts` - Middleware global
- **Algoritmo**: AES-256-GCM
- **Flujo**:
  1. Cliente obtiene key del servidor
  2. Cliente encripta payload
  3. Cliente envía `{ payload: "base64string" }`
  4. Servidor desencripta y procesa

### Authentication

- **Tokens**: JWT con 24h de validez
- **Almacenamiento**: localStorage
- **Verificación**: `server/middleware/auth.ts`
- **Roles**: ADMIN, GESTOR, ATENDENTE, PARCEIRO_ACREDITADO, ERPS_REPRESENTANTE

### Authorization

- **Framework**: CASL (custom implementation)
- **Backend**: `server/auth/casl/` - DB-driven permissions
- **Frontend**: `src/hooks/useAbility.ts` - UI hints only
- **Storage**: `RoleConfig` table en DB
- **Regla**: Backend siempre es la fuente de verdad

## 🗄️ Base de datos

### Multi-database con failover

```
PostgreSQL (Primary: PG_URL_1)
    ↓ Writes (parallel)
PostgreSQL (Backup: PG_URL_2)
MySQL (Backup: MYSQL_URL)
```

### Health checks

- **Intervalo**: Cada 60 segundos
- **Keep-alive**: Cada 12 horas (prevenir pausas de free-tier)
- **Backoff**: Exponencial para DBs desconectadas
- **Background sync**: Cuando DB vacía se recupera

### Data Access Layer (DAL)

**Siempre usar** `server/lib/db.ts`:

```typescript
import { db } from '../lib/db'

// CRUD operations
await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
await db.update('user', { id: '123' }, { nome: 'New' })
await db.delete('user', { id: '123' })
```

**Nunca llamar** `prisma.*` directamente en rutas.

### Gotchas DAL

- `db.transaction()` solo usa primary (no replication)
- Raw queries (`db.queryRaw()`) solo usan primary
- Models configurados en `server/lib/db-models.ts`

## 🎨 Frontend

### Stack

- **Framework**: React 19
- **Build**: Vite
- **UI**: shadcn/ui (new-york) + Radix UI primitives
- **Styling**: TailwindCSS 4
- **Icons**: Lucide
- **Routing**: React Router (BrowserRouter)
- **State**: React hooks (useState, useEffect, useContext)

### Estructura

```
src/
├── components/
│   └── ui/           # shadcn/ui components
├── pages/            # Route components
├── hooks/            # Custom hooks
├── lib/              # Utilities
├── auth/             # Auth & CASL logic
├── data/             # Constants & data services
└── layouts/          # Layout components
```

### Path aliases

- `@/*` → `./src/*` (configurado en tsconfig.json + vite.config.ts)

### Conventions

- **UI strings**: Portugués (pt-BR)
- **Identificadores**: Portugués (`modulo`, `aula`, `licao`)
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

## 🔧 Backend

### Stack

- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: Prisma ORM
- **Logging**: Pino
- **Email**: Gmail SMTP (primary) + Resend SMTP (backup)

### Estructura

```
server/
├── routes/           # API routes (all under /api/)
├── middleware/       # Express middleware
├── services/         # Business logic
├── lib/              # Utilities & DAL
├── auth/             # Auth & CASL logic
└── config/           # Configuration
```

### Rutas

Todas las rutas están bajo `/api/`:

- `/api/auth/*` - Authentication
- `/api/usuarios/*` - User management
- `/api/cms/*` - Content management
- `/api/certificates/*` - Certificates
- `/api/notifications/*` - Notifications
- `/api/progresso/*` - Learning progress
- `/api/dashboard/*` - Dashboard data
- `/api/analytics/*` - Analytics
- `/api/forum/*` - Forum
- `/api/gamification/*` - Gamification/XP
- `/api/conquistas/*` - Achievements
- `/api/logs/*` - Activity logs
- `/api/xpconfig/*` - XP configuration
- `/api/role-permissions/*` - Role permissions (CASL)

### Middleware

- `authenticate` - Verifica JWT token
- `authorize` - Verifica permisos (role-based o CASL)
- `encryption` - Desencripta payloads AES-256-GCM

## 🎮 Gamificación

### Sistema de XP

- **Configuración**: DB-driven via `XPConfig` table
- **Cache**: 60s in-memory cache en `server/services/gamification.ts`
- **Fallback**: Hardcoded defaults si DB falla
- **Nivel**: `Math.floor(xp / 2000) + 1`

### Puntos

- **Login**: 10 XP (una vez por día)
- **Module open**: 20 XP
- **Lesson complete**: 50 XP
- **Quiz pass**: 100 XP

### Deduplicación

- `awardPointsIfNotAwarded`: Deduplica por (userId, action, details)
- `awardLoginPointsDaily`: Limita login XP a una vez por día calendario

## 📧 Email Service

### Configuración

- **Primary**: Gmail SMTP
- **Backup**: Resend SMTP
- **Auto-fallback**: Cambia a backup si primary falla
- **BCC**: Todos los emails BCC a `email@academia.paygas.com.br`

### Uso

```typescript
import { sendEmail } from '../services/email'

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Asunto',
  html: '<p>Contenido HTML</p>'
})

// Result: { success, messageId, error }
```

## 📝 Activity Logs

### Logging

Todas las acciones de usuario se loggan a `ActivityLog` table:

```typescript
import { logActivity } from '../services/log'

await logActivity(userId, 'CREATE_USER', 'Created user with email: ...')
```

### Visibilidad

- **ADMIN**: Puede ver todos los logs en `/logs`
- **Filtros**: Por usuario, tipo de acción, rango de fechas

## 🚀 Deploy

### Target

- **Hosting**: cPanel
- **Reverse proxy**: nginx
- **Runtime**: Node.js directamente (no Passenger)
- **Script**: `./deploy.sh`

### Deploy script

1. Auto-detecta nginx
2. Compila (pnpm build)
3. Crea nginx snippet
4. Reinicia servidor

### Environment

- **Development**: `NODE_ENV=development` (o undefined)
- **Production**: `NODE_ENV=production`

### Diferencias dev vs prod

- **Dev**: Sin failover de DB, sin health checks, sin background sync
- **Prod**: Failover activo, health checks, background sync

## 🔧 Herramientas de desarrollo

### Linter/Formatter

- **Herramienta**: Biome (configurado en `biome.json`)
- **Tabs**: Tabs (no spaces)
- **Quotes**: Double quotes
- **Trailing commas**: Yes
- **Line width**: 120 caracteres

### Comandos

```bash
# Lint
pnpm lint              # Check
pnpm lint:fix          # Fix auto
pnpm format            # Format

# Typecheck
npx tsc --noEmit                           # Frontend
npx tsc --project tsconfig.server.json --noEmit  # Backend

# Build
pnpm build             # Full build (prisma + vite + tsc)

# Database
npx prisma generate    # Generate PG client
npx prisma migrate deploy
pnpm db:seed           # Seed test data
```

## 🌐 Naming gotchas

### Modulo vs Curso

- **DB table**: `Modulo`
- **Frontend/CMS**: Llama "Curso"
- **Campo**: `moduloId` en DB, `cursoId` en frontend context
- **Impacto**: Cosmético only, schema no cambia

### Roles

- **Enum**: `Role` en Prisma schema
- **Labels**: DB-driven via `RoleConfig` table
- **Frontend**: Usa `getRoleLabel()` desde localStorage cache
- **Backend**: Usa `getAllRoleConfigs()` con 60s cache

## 🚫 Limitaciones

### No test framework

- **Verificación**: Manual via API health check
- **Seed data**: `pnpm db:seed` crea usuarios de prueba
- **API health**: `GET /api/health`

### Dev mode limitations

- **Sin failover**: Si primary DB está down, reads fallan inmediatamente
- **Sin health checks**: Solo en production
- **Sin background sync**: Solo en production

## 📊 Estado actual

### Últimos commits

- `3107442` - fixes textos
- `08f22bd` - feat: renombrar label de rol 'Gestor de Posto' → 'Gestor / Líder'
- `928d5d2` - fix: biome audit — 478 errors → 0 errors (19 warnings)
- `9229580` - fix: biome lint/format fixes + AGENTS.md rewrite
- `fa63ff7` - feat: replace ESLint with Biome + replace console.* with Pino logger

### Issues conocidos

- Biome warnings en varios archivos (useExhaustiveDependencies, dangerouslySetInnerHTML)
- Sin test framework (verificación manual)
- Dev mode sin failover de DB

## 🎯 Próximos pasos

### Mejoras pendientes

- Implementar test framework (Jest/Vitest)
- Agregar failover en dev mode
- Migrar de localStorage a más robusto (IndexedDB?)
- Mejorar error handling en email service

### Features consideradas

- Sistema de notificaciones push (WebSocket)
- Analytics más avanzados
- Exportación de reports
- Sistema de surveys/feedback

## 📚 Recursos

### Documentación principal

- **AGENTS.md**: Documentación completa del proyecto
- **biome.json**: Configuración de linter/formatter
- **tsconfig.json**: Configuración TypeScript frontend
- **tsconfig.server.json**: Configuración TypeScript backend
- **prisma/schema.prisma**: Esquema PostgreSQL
- **prisma/schema.mysql.prisma**: Esquema MySQL

### Configuración Devin

- **.devin/README.md**: Esta configuración
- **.devin/instructions.md**: Políticas del agente
- **.devin/workflow.md**: Flujo de desarrollo
- **.devin/memory.md**: Uso de memoria persistente
- **.devin/tasks.md**: Gestión de tareas
- **.devin/patterns.md**: Patrones reutilizables
- **.devin/verification.md**: Guía de verificación
