# Arquitectura de Agentes - Academia PayGas

## Descripcion General

Academia PayGas utiliza una arquitectura modular de agentes para gestionar la interaccion entre usuarios y las funcionalidades de la plataforma. Cada agente es responsable de un aspecto especifico del sistema y se comunica con otros agentes a traves de eventos, API REST y estado compartido.

---

## 1. Authentication Agent

**Responsable de:** Autenticacion, gestion de sesiones y validacion de permisos.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Primario |
| **Alcance** | Global |
| **Archivo Principal** | `src/hooks/useAuth.ts` |
| **Backend** | `server/routes/auth.ts`, `server/middleware/auth.ts` |
| **Dependencias** | Ninguna |
| **API Endpoints** | `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/verify-email` |

### Funcionalidades

- Login con email y contrasena
- Validacion de token JWT (expira en 24h)
- Gestion de sesiones en localStorage
- Control de roles y permisos (ADMIN, GESTOR, ATENDENTE)
- Verificacion de email con tokens
- Logout y limpieza de sesion

### Seguridad Implementada

- **Rate limiting:** 10 intentos maximo en 15 minutos para login
- **JWT_SECRET:** Obligatorio via variable de entorno (sin fallback)
- **Bcrypt salt rounds:** 12 (hardcoded, no configurable)
- **Sin refresh tokens:** JWT unico con expiracion de 24h

### Flujo de Autenticacion

```
1. Usuario accede a /login
2. Completa formulario (email + contrasena)
3. POST /api/auth/login → backend valida credenciales
4. Backend retorna token JWT + usuario
5. Frontend almacena en localStorage (key: "user")
6. useAuth() hook proporciona contexto global
7. Redirige a /dashboard (pagina protegida)
```

### Roles y Permisos

| Rol | Permisos | XP Inicial |
|-----|----------|-----------|
| **ADMIN** | Crear/editar modulos, gestionar usuarios, CMS completo | 8500 |
| **GESTOR** | Editar modulos de su gestoria, ver reportes, gestionar equipo | 4100 |
| **ATENDENTE** | Ver modulos, completar aulas, hacer quizzes, ver certificados | 2400 |

---

## 2. Navigation Agent

**Responsable de:** Enrutamiento, control de acceso y navegacion entre paginas.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Primario |
| **Alcance** | Global |
| **Archivo Principal** | `src/App.tsx` (React Router v7) |
| **Dependencias** | Authentication Agent |
| **Middleware** | ProtectedRoute, RoleRoute |

### Mapa de Rutas

| Ruta | Componente | Acceso | Descripcion |
|------|-----------|--------|-------------|
| `/login` | LoginPage | Publico | Pagina de login |
| `/verificar-email` | VerificarEmailPage | Publico | Verificacion de email |
| `/` | DashboardPage | Autenticado | Panel principal |
| `/modulos` | ModulosListPage | Autenticado | Lista de modulos |
| `/modulo/:moduloNombre` | ModulosPage | Autenticado | Aulas y contenido |
| `/certificados` | CertificadosPage | Autenticado | Certificados emitidos |
| `/equipe` | EquipePage | Gestor/Admin | Gestion de equipo |
| `/relatorios` | RelatoriosPage | Gestor/Admin | Reportes y estadisticas |
| `/cms` | CMSPage | Admin | Gestion de contenido |
| `/cms/criar-modulo` | CriarModuloPage | Admin | Crear nuevo modulo |
| `/usuarios` | UsuariosPage | Admin | Gestion de usuarios |
| `/notif` | NotifPage | Autenticado | Notificaciones |
| `/perfil` | PerfilPage | Autenticado | Perfil del usuario |

### Flujo de Navegacion

```
Acceso a ruta
  ↓
¿Token valido? → No → Redirige a /login
  ↓ Si
¿Ruta requiere rol especifico? → No → Carga componente
  ↓ Si
¿Usuario tiene rol? → No → Redirige a /
  ↓ Si
Carga componente con acceso
```

---

## 3. Learning Agent

**Responsable de:** Gestion de modulos, aulas y progreso del estudiante.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Archivos Principales** | `src/pages/ModulosListPage.tsx`, `src/pages/ModulosPage.tsx` |
| **Backend** | `server/routes/cms.ts`, `server/routes/progresso.ts` |
| **Dependencias** | Navigation Agent, Quiz Agent |
| **API Endpoints** | `/api/cms/*`, `/api/modulos/*`, `/api/progresso/*` |

### Jerarquia de Contenido

```
Modulo (Categoria de aprendizaje)
  ├── Aula #1 (Video YouTube o PDF)
  │    └── Quiz? (Opcional, 1:1 con aula)
  │         └── Pregunta de opcion multiple
  ├── Aula #2
  │    └── Quiz?
  └── Aula #N
```

### Flujo de Aprendizaje (Estudiante)

```
1. Ver Modulos (GET /api/modulos)
   ↓
2. Seleccionar Modulo → Ver Aulas (GET /api/modulos/:id/aulas)
   ↓
3. Para cada Aula:
   - Mostrar contenido (video/PDF)
   - Boton "Siguiente Aula" o "Concluir"
   - Actualizar progreso (PUT /api/progresso)
   ↓
4. En ultima aula del modulo → Mostrar Quiz (si existe)
   ↓
5. Quiz completado:
   - Si nota >= 7: Aprobado
   - Si autoGerarCertificado: Emitir automaticamente
   - Si nota < 7: Permitir reintentar
   ↓
6. Ver Certificado (GET /api/certificates)
```

### Offline Support (Dexie.js)

El sistema soporta funcionamiento offline mediante IndexedDB:

- **Cache local:** Modulos, aulas, quizzes, progreso, certificados
- **Cola de sincronizacion:** Operaciones pendientes cuando no hay conexion
- **Auto-sync:** Sincronizacion automatica cada 30 segundos cuando hay conexion
- **Conflictos:** Ultima escritura gana (sin merge de conflictos)

---

## 4. Gamification Agent

**Responsable de:** Sistema de puntos (XP), niveles y logros.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Backend** | `server/services/gamification.ts` |
| **Dependencias** | Learning Agent, Quiz Agent |
| **Metrica** | XP (Experience Points) |

### Sistema de XP

| Accion | XP Ganado | Notas |
|--------|----------|-------|
| Login diario | +10 XP | Una vez por dia |
| Abrir modulo | +20 XP | Por modulo |
| Completar aula | +50 XP | Sin quiz |
| Completar modulo | +150 XP | Todas las aulas |
| Respuesta correcta quiz | +30 XP | Por pregunta correcta |
| Aprobar quiz (nota >= 7) | +100 XP | Una vez por quiz |
| Obtener certificado | +500 XP | Una sola vez por modulo |

### Calculo de Nivel

```javascript
// Nivel = Math.floor(xpTotal / 2000) + 1
// Nivel 1: 0-1999 XP
// Nivel 2: 2000-3999 XP
// Nivel 3: 4000-5999 XP
// ...
// Nivel N: (N-1)*2000 XP
```

### Endpoints de Gamificacion

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/modulos/:id/open` | Registrar apertura de modulo |
| GET | `/api/modulos/gamification/leaderboard` | Top 20 usuarios |
| GET | `/api/modulos/gamification/stats` | Estadisticas globales |
| GET | `/api/dashboard/leaderboard` | Leaderboard del equipo |

---

## 5. Quiz Agent

**Responsable de:** Creacion, gestion y correccion de cuestionarios.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por aula/modulo |
| **Archivos Principales** | `src/pages/ModulosPage.tsx` (respuesta), `src/pages/CMSPage.tsx` (gestion) |
| **Backend** | `server/routes/cms.ts` |
| **API Endpoints** | `/api/modulos/quiz/*`, `/api/modulos/perguntas/*` |
| **Dependencias** | Learning Agent |

### Endpoints de Quiz

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-----------|-----|
| POST | `/api/modulos/:moduloId/quiz` | Crear quiz | Admin |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obtener quiz | Cualquiera |
| PUT | `/api/modulos/quiz/:quizId` | Actualizar quiz | Admin |
| DELETE | `/api/modulos/quiz/:quizId` | Eliminar quiz | Admin |
| POST | `/api/modulos/quiz/:quizId/perguntas` | Anadir pregunta | Admin |
| PUT | `/api/modulos/perguntas/:perguntaId` | Actualizar pregunta | Admin |
| DELETE | `/api/modulos/perguntas/:perguntaId` | Eliminar pregunta | Admin |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respuestas | Estudiante |
| GET | `/api/modulos/quiz/:quizId/resultados` | Ver resultados | Estudiante |

### Flujo de Quiz

```
Estudiante abre ultima aula del modulo
  ↓
¿Existe quiz? → No → Mostrar "Modulo completado"
  ↓ Si
Mostrar formulario de quiz
  ↓
Estudiante selecciona respuestas (A/B/C/D)
  ↓
Clica "Enviar Respuestas" → POST /api/modulos/quiz/:quizId/responder
  ↓
Backend calcula nota (0-10)
  ↓
nota >= 7?
  ├─ Si → Mostrar "Aprobado"
  │        ↓
  │        autoGerarCertificado?
  │        ├─ Si → POST /api/certificates (auto-emitir)
  │        └─ No → Notificar al administrador
  │
  └─ No → Mostrar "Reprobado"
           ↓
           ¿Intentos restantes? → Si → Permitir reintentar
```

---

## 6. Notification Agent

**Responsable de:** Creacion, almacenamiento y entrega de notificaciones.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Archivo Principal** | `src/pages/NotifPage.tsx` |
| **Backend** | `server/routes/notifications.ts` |
| **API Endpoints** | `/api/notifications/*` |
| **Dependencias** | Authentication Agent, Learning Agent |

### Tipos de Notificacion

| Tipo | Evento Disparador | Contenido |
|------|------------------|----------|
| Nuevo Modulo | Admin publica modulo | "Nueva aula disponible: {nombre}" |
| Subida de Nivel | Usuario alcanza nivel X | "¡Subiste a nivel {nivel}!" |
| Certificado | Quiz aprobado | "Certificado emitido: {modulo}" |

### Endpoints Completos

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-----------|-----|
| GET | `/api/notifications` | Listar notificaciones | Autenticado |
| POST | `/api/notifications` | Crear notificacion | Admin/Gestor |
| PUT | `/api/notifications/:id/read` | Marcar como leida | Autenticado (propietario) |
| PUT | `/api/notifications/read-all` | Marcar todas como leidas | Autenticado |

### Seguridad

- Solo el destinatario puede marcar una notificacion como leida
- Solo ADMIN/GESTOR pueden crear notificaciones

---

## 7. Encryption Agent

**Responsable de:** Encriptacion de payloads entre cliente y servidor.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Infraestructura |
| **Alcance** | Global |
| **Cliente** | `src/lib/crypto.ts` (Web Crypto API) |
| **Servidor** | `server/middleware/encryption.ts`, `server/lib/crypto.ts` |
| **Algoritmo** | AES-256-GCM con PBKDF2 |

### Flujo de Encriptacion

```
Cliente (Frontend)
  ↓
encrypt(JSON.stringify(body)) → base64
  ↓
{ encrypted: "base64string" }
  ↓
Servidor (Express middleware)
  ↓
decrypt(base64) → JSON.parse(body)
  ↓
Request procesado con body desencriptado
```

### Configuracion

- **Clave:** `ENCRYPTION_KEY` (variable de entorno, sin fallback)
- **Cliente:** `VITE_ENCRYPTION_KEY` (inyectada via vite.config.ts)
- **Iteraciones PBKDF2:** 100,000
- **Salt:** 64 bytes aleatorios por operacion
- **IV:** 16 bytes aleatorios por operacion

### Endpoints Encriptados

Todos los requests POST/PUT/PATCH son encriptados automaticamente:
- `encryptedPayload` middleware en `server/index.ts`
- `ApiClient.request()` en `src/lib/api.ts`

---

## 8. Offline Sync Agent

**Responsable de:** Gestion de la cola de sincronizacion offline.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Infraestructura |
| **Alcance** | Cliente |
| **Archivo Principal** | `src/lib/sync.ts`, `src/lib/db.ts` |
| **Backend** | Ninguno (solo cola local) |
| **Max Reintentos** | 5 por item |

### Funcionalidades

- **Deteccion de conexion:** `navigator.onLine`
- **Cola persistente:** Dexie.js (IndexedDB)
- **Auto-sync:** Cada 30 segundos cuando hay conexion
- **Max reintentos:** 5 por item antes de descartar

### Estructura de la Cola

```typescript
interface SyncQueueItem {
  id?: number
  method: string    // GET, POST, PUT, DELETE
  path: string      // /api/usuarios
  body: string      // JSON stringified
  createdAt: string // ISO timestamp
  retryCount: number
}
```

### Flujo

```
Operacion offline
  ↓
queueSync(method, path, body) → Dexie IndexedDB
  ↓
 Cuando vuelve la conexion:
  ↓
processSyncQueue()
  ↓
Para cada item en la cola:
  ├─ retryCount < 5? → Intentar enviar
  │   ├─ Exito → Eliminar de la cola
  │   └─ Error → Incrementar retryCount
  └─ retryCount >= 5 → Descartar item
```

---

## Flujo de Datos General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIO (Frontend)                            │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ├─→ Authentication Agent (Login/Logout/Permisos)
              │
              ├─→ Navigation Agent (Rutas protegidas)
              │
              ├─→ Learning Agent (Ver modulos/aulas)
              │
              ├─→ Quiz Agent (Responder cuestionarios)
              │
              ├─→ Gamification Agent (Ganar XP, logros)
              │
              ├─→ Encryption Agent (Encriptar payloads)
              │
              ├─→ Offline Sync Agent (Cola de sincronizacion)
              │
              └─→ Notification Agent (Recibir alertas)
                      │
                      ↓
              ┌──────────────────┐
              │  Express Server  │
              │  (API REST)      │
              └────────┬─────────┘
                      │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
   PostgreSQL    Nodemailer       Storage
   (Datos)     (Email/SMTP)      (Archivos)
```

---

## Seguridad del Sistema

### Medidas Implementadas

| Medida | Estado | Ubicacion |
|--------|--------|-----------|
| Helmet (security headers) | ✅ | `server/index.ts` |
| CORS whitelist | ✅ | `server/index.ts` |
| Rate limiting global (200/15min) | ✅ | `server/index.ts` |
| Rate limiting auth (10/15min) | ✅ | `server/index.ts` |
| JWT sin fallback hardcoded | ✅ | `server/middleware/auth.ts` |
| ENCRYPTION_KEY sin fallback | ✅ | `server/middleware/encryption.ts` |
| Bcrypt salt 12 | ✅ | `server/routes/usuarios.ts` |
| Validacion de destinatario (notifications) | ✅ | `server/routes/notifications.ts` |
| Paginacion en endpoints | ✅ | `usuarios.ts`, `cms.ts`, `certificates.ts` |
| Queries paralelas (dashboard) | ✅ | `server/routes/dashboard.ts` |
| Sin error details al cliente | ✅ | `server/routes/auth.ts` |

### Variables de Entorno Requeridas

| Variable | Obligatoria | Descripcion |
|----------|-------------|-------------|
| `DATABASE_URL` | Si | Conexion PostgreSQL |
| `JWT_SECRET` | Si | Firma de tokens JWT |
| `ENCRYPTION_KEY` | Si | Encriptacion AES-256-GCM |
| `VITE_ENCRYPTION_KEY` | Si | Clave encriptacion frontend |
| `ALLOWED_ORIGINS` | Si | Dominios permitidos CORS |
| `SMTP_HOST` | No | Servidor de correo |
| `SMTP_PORT` | No | Puerto SMTP |
| `SMTP_USER` | No | Usuario SMTP |
| `SMTP_PASS` | No | Contrasena SMTP |
| `SMTP_FROM` | No | Remitente de correos |
| `SMTP_SECURE` | No | TLS habilitado |
| `APP_URL` | No | URL de la aplicacion |
| `PORT` | No | Puerto del servidor (default: 3001) |

---

## Persistencia de Datos

| Datos | Ubicacion | Metodo | Agente Responsable |
|-------|-----------|--------|-------------------|
| Sesion de usuario | localStorage | Key: "user" | Authentication |
| Cache offline | IndexedDB (Dexie) | Tablas multiples | Offline Sync |
| Progreso del estudiante | PostgreSQL (Progresso) | API REST | Learning |
| Quizzes y respuestas | PostgreSQL (Quiz, QuizResponse) | API REST | Quiz |
| XP y niveles | PostgreSQL (User, PointsTransaction) | API REST | Gamification |
| Notificaciones | PostgreSQL (Notification) | API REST | Notification |
| Certificados | PostgreSQL (Certificate) | API REST | Learning |
| Activity logs | PostgreSQL (ActivityLog) | API REST | Learning |

---

## Integracion SMTP

Las notificaciones criticas son enviadas por email mediante **Nodemailer**:

```
Quiz Aprobado → Quiz Agent notifica
                     ↓
              Notification Agent (crea registro)
                     ↓
              Email Service (Nodemailer)
                     ↓
              SMTP (Credenciales en .env)
                     ↓
              Email al usuario
```

### Variables SMTP (.env)

```env
SMTP_HOST=mail.midominio.com
SMTP_PORT=587
SMTP_USER=notificaciones@midominio.com
SMTP_PASS=contrasena_segura
SMTP_FROM=Academia PayGas <notificaciones@midominio.com>
SMTP_SECURE=true
APP_URL=https://academia.paygas.com.br
```

---

## Desarrollo e Integracion

### Agregar un Nuevo Agente

1. Crear archivo en `src/hooks/useNewAgent.ts` o `src/services/NewAgent.ts`
2. Implementar interfaz y metodos principales
3. Conectar con componentes en `src/pages/`
4. Crear endpoints en `server/routes/newagent.ts`
5. Documentar en este archivo (agents.md)

### Comandos Utiles

```bash
# Desarrollo
pnpm dev                    # Iniciar servidor + cliente
pnpm dev:server             # Solo servidor
pnpm dev:client             # Solo cliente

# Build
pnpm build                  # Build completo
pnpm build:server           # Solo servidor
pnpm build:client           # Solo cliente

# Base de datos
pnpm db:generate            # Generar cliente Prisma
pnpm db:migrate             # Ejecutar migraciones
pnpm db:seed                # Poblar base de datos
pnpm db:reset               # Reset + seed

# Produccion
pnpm start:prod             # Iniciar en produccion
```

---

*Ultima actualizacion: 2026-06-18*
*Version de Documentacion: 3.0*
*Auditado por: Ingeniero de Software especialista*
