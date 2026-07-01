# Patterns — Patrones Reutilizables del Proyecto

## 🎯 Objetivo

Documentar patrones reutilizables para evitar código duplicado y mantener consistencia en el proyecto.

## 🔐 Authentication & Authorization

### JWT Authentication Pattern

**Ubicación:** `server/middleware/auth.ts`

**Uso:**

```typescript
import { authenticate, authorize } from '../middleware/auth'

// Role-based (backward compat)
router.get('/users', authenticate, authorize('ADMIN', 'GESTOR'), handler)

// CASL ability-based (preferred)
router.post('/users', authenticate, authorize('create', 'User'), handler)
router.put('/users/:id', authenticate, authorize('update', 'User', JSON.stringify({ gestorId: req.userId })))
```

**Gotchas:**
- CASL conditions deben ser JSON.stringified
- CASL action list está hardcoded en `authorize()` middleware
- Si agregas nuevo CASL action, actualizar la lista en middleware

---

### Frontend Permission Check Pattern

**Ubicación:** `src/hooks/useAbility.ts`

**Uso:**

```typescript
const { can, cannot, isAdmin, isGestor, isAtendente, isParceiro, isErps } = useAbility()

if (can('delete', 'User')) {
  // Show delete button
}

if (isAdmin) {
  // Show admin-only UI
}
```

**Gotchas:**
- Frontend CASL es custom (no usa @casl/ability library)
- Backend siempre es la fuente de verdad
- Esto es solo para UI hints, nunca para seguridad

---

## 🗄️ Database Access Patterns

### DAL CRUD Pattern

**Ubicación:** `server/lib/db.ts`

**Uso:**

```typescript
import { db } from '../lib/db'

// Create
await db.create('user', { email, nome, senha })

// Read
await db.findUnique('user', { id: '123' })
await db.findMany('user', { where: { ativo: true } })

// Update
await db.update('user', { id: '123' }, { nome: 'New' })

// Upsert
await db.upsert('progresso', { where: { ... } }, { create: { ... } }, { update: { ... } })

// Delete
await db.delete('user', { id: '123' })
```

**Gotchas:**
- Nunca llamar `prisma.*` directamente en rutas
- `db.transaction()` solo usa primary (no replication)
- Raw queries (`db.queryRaw()`) solo usan primary

---

### Multi-Database Dual-Write Pattern

**Ubicación:** `server/lib/db.ts`, `server/lib/db-models.ts`

**Descripción:** Escribir a primary y backup databases en paralelo.

**Uso automático:** Usar funciones DAL (`db.create`, `db.update`, etc.) que ya implementan dual-write.

**Gotchas:**
- Dual-write solo si backup DBs están configuradas (env vars)
- Si `MYSQL_URL` no está set, MySQL writes se skip silenciosamente
- Si `NHOST_URL` no está set, Nhost writes se skip silenciosamente

---

## 🎨 Frontend Patterns

### Component Pattern (shadcn/ui)

**Ubicación:** `src/components/ui/`

**Uso:**

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="..." />
        <Button>Click</Button>
      </CardContent>
    </Card>
  )
}
```

**Gotchas:**
- Usar componentes existentes antes de crear nuevos
- Seguir patrones en `src/pages/` para layouts complejos

---

### Custom Hook Pattern

**Ubicación:** `src/hooks/`

**Ejemplo:** `src/hooks/useAuth.ts`, `src/hooks/useAbility.ts`

**Uso:**

```typescript
import { useAuth } from '../hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, handleLogin, handleLogout } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}
```

**Gotchas:**
- Usar hooks existentes antes de crear nuevos
- Seguir patrones de error handling en hooks existentes

---

### API Client Pattern

**Ubicación:** `src/lib/api.ts`

**Uso:**

```typescript
import { api } from '../lib/api'

// GET
const users = await api.getUsers()

// POST
const user = await api.createUser({ email, nome, senha })

// PUT
const updated = await api.updateUser(id, { nome: 'New' })

// DELETE
await api.deleteUser(id)
```

**Gotchas:**
- API client maneja authentication (JWT) automáticamente
- Error handling centralizado en api client
- Encryption manejado automáticamente para POST/PUT/PATCH

---

## 🔧 Backend Patterns

### Route Pattern

**Ubicación:** `server/routes/`

**Estructura:**

```typescript
import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import logger from '../lib/logger'

const router = Router()

// GET endpoint
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // Business logic
    res.json(result)
  } catch (error) {
    logger.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Error message' })
  }
})

// POST endpoint
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    // Business logic
    res.json(result)
  } catch (error) {
    logger.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Error message' })
  }
})

export default router
```

**Gotchas:**
- Todas las rutas bajo `/api/`
- Usar `authenticate` para endpoints protegidos
- Usar `authorize` para authorization
- Usar logger para error logging
- Error handling try-catch en cada endpoint

---

### Service Pattern

**Ubicación:** `server/services/`

**Ejemplo:** `server/services/email.ts`, `server/services/gamification.ts`

**Uso:**

```typescript
import { sendEmail } from '../services/email'

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Asunto',
  html: '<p>Contenido</p>'
})

if (!result.success) {
  logger.error('[EMAIL ERROR]', result.error)
}
```

**Gotchas:**
- Services contienen business logic complejo
- Services pueden tener cache (ej: gamification con 60s cache)
- Services manejan fallbacks (ej: email con backup SMTP)

---

### Middleware Pattern

**Ubicación:** `server/middleware/`

**Uso:**

```typescript
import { authenticate, authorize } from '../middleware/auth'

router.get('/protected', authenticate, authorize('ADMIN'), handler)
```

**Middleware disponibles:**
- `authenticate` - Verifica JWT token
- `authorize` - Verifica permisos (role-based o CASL)
- `encryption` - Desencripta payloads AES-256-GCM (global)

---

## 🎮 Gamification Patterns

### XP Award Pattern

**Ubicación:** `server/services/gamification.ts`

**Uso:**

```typescript
import { awardPoints, awardPointsIfNotAwarded, awardLoginPointsDaily } from '../services/gamification'

// Simple award
await awardPoints(userId, 'LESSON_COMPLETE', 50, 'Completed lesson: ...')

// Deduplicated award
await awardPointsIfNotAwarded(userId, 'QUIZ_PASS', 100, { quizId: '123' })

// Daily login points
await awardLoginPointsDaily(userId)
```

**Gotchas:**
- XP config es DB-driven via `XPConfig` table
- 60s in-memory cache para performance
- Fallback a hardcoded defaults si DB falla

---

### Activity Log Pattern

**Ubicación:** `server/services/log.ts`

**Uso:**

```typescript
import { logActivity } from '../services/log'

await logActivity(userId, 'CREATE_USER', 'Created user with email: ...')
await logActivity(userId, 'UPDATE_PROFILE', 'Updated nome and email')
```

**Gotchas:**
- Todas las acciones de usuario deben ser loggeadas
- ADMIN puede ver logs en `/logs` con filtros

---

## 📧 Email Pattern

**Ubicación:** `server/services/email.ts`

**Uso:**

```typescript
import { sendEmail } from '../services/email'

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Asunto',
  html: '<p>Contenido HTML</p>'
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

**Gotchas:**
- Primary: Gmail SMTP
- Backup: Resend SMTP
- Auto-fallback si primary falla
- Todos los emails BCC a `email@academia.paygas.com.br`

---

## 🔐 Encryption Pattern

**Ubicación:** `src/lib/crypto.ts` (client), `server/middleware/encryption.ts` (server)

**Flujo:**

1. **Cliente obtiene key:**
```typescript
import { getEncryptionKey, encryptPayload } from '../lib/crypto'

const key = await getEncryptionKey()
const encrypted = encryptPayload(data, key)
```

2. **Cliente envía payload:**
```typescript
await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: encrypted })
})
```

3. **Servidor desencripta:**
```typescript
// Middleware encryption hace esto automáticamente
// No necesita código manual en rutas
```

**Gotchas:**
- Encryption middleware es global (aplica a todos POST/PUT/PATCH)
- Cliente debe obtener key antes de primer request encriptado
- Key se obtiene de `GET /api/config` (requiere auth token)

---

## 🎨 UI Patterns

### Form Pattern

**Ubicación:** Varios en `src/pages/`

**Estructura:**

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function MyForm() {
  const [formData, setFormData] = useState({ email: '', nome: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createSomething(formData)
      // Success handling
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </Button>
    </form>
  )
}
```

**Gotchas:**
- Usar componentes de `src/components/ui/`
- Manejar loading states
- Manejar error states
- Validar inputs antes de submit

---

### Table Pattern

**Ubicación:** Varios en `src/pages/`

**Estructura:**

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function MyTable({ data }: { data: ItemType[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column 1</TableHead>
          <TableHead>Column 2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.field1}</TableCell>
            <TableCell>{item.field2}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Gotchas:**
- Usar componentes de shadcn/ui Table
- Agregar key en cada row
- Considerar pagination para datasets grandes

---

## 🔄 State Management Patterns

### Local State Pattern

**Uso:** Para estado simple, component-local

```typescript
const [isOpen, setIsOpen] = useState(false)
const [data, setData] = useState<ItemType[]>([])
```

### Context Pattern

**Uso:** Para estado global o compartido

**Ejemplo:** Auth context, Ability context

```typescript
const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // ...

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## 🧪 Testing Patterns

### Manual Verification Pattern

**Ubicación:** No hay test framework

**Uso:**

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

**Gotchas:**
- Verificación manual via API health check
- Seed data via `pnpm db:seed`
- No hay test framework (considerar agregar Jest/Vitest)

---

## 📝 Error Handling Patterns

### Frontend Error Handling

**Uso:**

```typescript
try {
  await api.someOperation()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('HTTP 401')) {
    // Unauthorized - redirect to login
    handleLogout()
  } else {
    // Show error to user
    showError(message)
  }
}
```

### Backend Error Handling

**Uso:**

```typescript
router.get('/endpoint', authenticate, async (req: AuthRequest, res) => {
  try {
    // Business logic
    res.json(result)
  } catch (error) {
    logger.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Error message' })
  }
})
```

**Gotchas:**
- Siempre usar try-catch en async route handlers
- Usar logger para error logging
- Retornar error messages user-friendly (no exponer detalles técnicos)

---

## 🎯 Cómo agregar nuevos patrones

1. **Identificar patrón reutilizable**
2. **Documentar aquí** con:
   - Ubicación
   - Uso con ejemplo
   - Gotchas específicos
3. **Registrar en codebase-memory-mcp:**

```typescript
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: `
    CREATE (p:Pattern {
      name: "Nombre del patrón",
      description: "Descripción",
      files: ["archivo1.ts", "archivo2.ts"],
      use_case: "Cuándo usar este patrón",
      implementation: "Cómo implementar",
      gotchas: ["Gotcha 1", "Gotcha 2"]
    })
  `
})
```

4. **Actualizar AGENTS.md** si es patrón de arquitectura significativo

---

## 📚 Patrones por categoría

### Authentication & Authorization
- JWT Authentication Pattern
- Frontend Permission Check Pattern

### Database
- DAL CRUD Pattern
- Multi-Database Dual-Write Pattern

### Frontend
- Component Pattern (shadcn/ui)
- Custom Hook Pattern
- API Client Pattern
- Form Pattern
- Table Pattern
- State Management Patterns

### Backend
- Route Pattern
- Service Pattern
- Middleware Pattern

### Gamification
- XP Award Pattern
- Activity Log Pattern

### Communication
- Email Pattern
- Encryption Pattern

### Error Handling
- Frontend Error Handling
- Backend Error Handling

### Testing
- Manual Verification Pattern
