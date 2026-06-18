# Academia PayGas - Sistema de Aprendizaje Empresarial

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-green)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Nhost-336791)](https://nhost.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748)](https://www.prisma.io/)

## Indice

- [Vision General](#vision-general)
- [Stack Tecnologico](#stack-tecnologico)
- [Comenzar Rapidamente](#comenzar-rapidamente)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuracion](#configuracion)
- [Seguridad](#seguridad)
- [API Endpoints](#api-endpoints)
- [Funcionalidades](#funcionalidades)
- [Desarrollo](#desarrollo)
- [Deployment](#deployment)

---

## Vision General

Academia PayGas es una plataforma de aprendizaje corporativo para educacion y desarrollo de equipo. Ofrece un sistema completo de modulos, lecciones con videos, cuestionarios interactivos, certificacion y gamification.

**Publico objetivo**: Empleados de estaciones de gasolina PayGas que necesitan entrenamiento continuo en excelencia de servicio, operacion de terminales, seguridad de datos, gestion financiera y liderazgo.

### Caracteristicas Principales

- Modulos de aprendizaje estructurados
- Contenido multimedia (videos YouTube, PDFs)
- Cuestionarios interactivos con evaluacion automatica
- Gamificacion (XP, niveles, leaderboard)
- Autenticacion JWT con control de acceso por roles
- Encriptacion AES-256-GCM para payloads
- Soporte offline con Dexie.js (IndexedDB)
- Dashboard con estadisticas y progreso
- Interfaz responsiva con Tailwind CSS

---

## Stack Tecnologico

### Frontend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 19 | UI library |
| TypeScript | 5.7 | Type safety |
| Vite | 6.x | Build tool |
| TailwindCSS | 4.x | Styling |
| Radix UI | - | Componentes accesibles |
| React Router | 7.x | Enrutamiento |
| Zustand | 5.x | Gestion de estado |
| TanStack Query | 5.x | Data fetching y cache |
| Dexie.js | 4.x | IndexedDB (offline) |

### Backend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Express.js | 5.x | Framework web |
| Node.js | 22+ | Runtime |
| TypeScript | 5.7 | Backend seguro de tipos |
| Prisma | 7.x | ORM |
| PostgreSQL | - | Base de datos |
| JWT | - | Autenticacion |
| bcryptjs | 3.x | Hash de contrasenas |
| Nodemailer | 9.x | Servicio de correo |
| Helmet | 8.x | Security headers |
| express-rate-limit | 8.x | Rate limiting |

### DevTools

| Herramienta | Proposito |
|-------------|-----------|
| ESLint | Linting de codigo |
| TypeScript | Type checking |
| tsx | Ejecucion de TypeScript |
| Concurrently | Ejecutar multiples procesos |

---

## Comenzar Rapidamente

### Requisitos Previos

- Node.js 22+
- pnpm (o npm/yarn)
- Git
- PostgreSQL (local o Nhost)

### Instalacion

```bash
# Clone el repositorio
git clone https://github.com/Dev-OlaMulticom/academia-paygas.git
cd academia-paygas

# Instale dependencias
pnpm install

# Configure variables de entorno
cp .env.production.example .env
# Edite .env con sus credenciales (ver seccion Configuracion)

# Prepare la base de datos
npx prisma generate
npx prisma migrate deploy
npx prisma db seed  # (opcional - datos de prueba)

# Inicie el servidor
pnpm dev
```

### URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| API Docs | http://localhost:3001/api/docs |
| Health Check | http://localhost:3001/api/health |

---

## Estructura del Proyecto

```
academia-paygas/
├── server/                    # Backend Express
│   ├── index.ts              # Servidor principal (Express + Helmet + CORS + Rate Limiting)
│   ├── lib/
│   │   ├── prisma.ts         # Cliente Prisma singleton
│   │   └── crypto.ts         # Utilitarios de encriptacion (servidor)
│   ├── middleware/
│   │   ├── auth.ts           # JWT y autorizacion
│   │   └── encryption.ts     # Encriptacion de payloads AES-256-GCM
│   ├── routes/
│   │   ├── auth.ts           # Login, verificacion de email
│   │   ├── usuarios.ts       # CRUD usuarios (con paginacion)
│   │   ├── cms.ts            # Modulos, aulas, quizzes (con paginacion)
│   │   ├── certificates.ts   # Certificados (con paginacion)
│   │   ├── notifications.ts  # Notificaciones
│   │   ├── progresso.ts      # Progreso de aprendizaje
│   │   ├── dashboard.ts      # Dashboard y estadisticas
│   │   └── docs.ts           # Documentacion API
│   ├── services/
│   │   ├── email.ts          # Envio de correos SMTP
│   │   └── gamification.ts   # Sistema de XP y niveles
│   └── utils/
│       └── queryParams.ts    # Utilitarios de parametros
│
├── src/                      # Frontend React
│   ├── App.tsx              # Router principal
│   ├── main.tsx             # Entry point
│   ├── index.css            # Estilos globales
│   ├── pages/               # Paginas de la aplicacion
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ModulosListPage.tsx
│   │   ├── ModulosPage.tsx
│   │   ├── CertificadosPage.tsx
│   │   ├── EquipePage.tsx
│   │   ├── RelatoriosPage.tsx
│   │   ├── CMSPage.tsx
│   │   ├── CriarModuloPage.tsx
│   │   ├── UsuariosPage.tsx
│   │   ├── NotifPage.tsx
│   │   ├── PerfilPage.tsx
│   │   └── VerificarEmailPage.tsx
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoPreview.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── AIPanel.tsx
│   │   └── ui/              # Componentes UI (shadcn/ui)
│   ├── hooks/
│   │   ├── useAuth.ts       # Hook de autenticacion
│   │   ├── useSync.ts       # Hook de sincronizacion
│   │   └── use-toast.ts     # Hook de notificaciones
│   ├── lib/
│   │   ├── api.ts           # Cliente API con cache offline
│   │   ├── db.ts            # Dexie.js (IndexedDB)
│   │   ├── sync.ts          # Cola de sincronizacion offline
│   │   ├── crypto.ts        # Encriptacion (cliente - Web Crypto)
│   │   └── utils.ts         # Utilitarios
│   ├── layouts/
│   │   └── AppLayout.tsx    # Layout principal
│   └── data/
│       └── constants.ts     # Constantes (roles, personas)
│
├── prisma/
│   ├── schema.prisma        # Definicion del esquema
│   ├── migrations/          # Migraciones de base de datos
│   ├── seed.ts              # Script de inicializacion
│   └── prisma.config.ts     # Configuracion de Prisma
│
├── public/                  # Activos estaticos
├── styles/                  # CSS global
├── .env                     # Variables de entorno (NO commitear)
├── .env.production.example  # Ejemplo de variables para produccion
├── .gitignore               # Archivos ignorados por git
├── .htaccess                # Seguridad Apache (cPanel)
├── vite.config.ts           # Configuracion Vite
├── tsconfig.json            # TypeScript config (frontend)
├── tsconfig.server.json     # TypeScript config (backend)
├── package.json             # Dependencias
└── pnpm-lock.yaml           # Lock file
```

---

## Configuracion

### Variables de Entorno

Cree un archivo `.env` basado en `.env.production.example`:

```bash
# ═══════════════════════════════════════════════════════════
# Base de datos (PostgreSQL)
# ═══════════════════════════════════════════════════════════
DATABASE_URL="postgres://user:password@host:5432/dbname"

# ═══════════════════════════════════════════════════════════
# Seguridad (OBLIGATORIO - sin fallbacks)
# ═══════════════════════════════════════════════════════════
# Generar claves fuertes:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="tu-clave-jwt-secreta"
ENCRYPTION_KEY="tu-clave-encriptacion"

# ═══════════════════════════════════════════════════════════
# CORS (dominios permitidos, separados por coma)
# ═══════════════════════════════════════════════════════════
ALLOWED_ORIGINS="https://academia.paygas.com.br,http://localhost:5173"

# ═══════════════════════════════════════════════════════════
# Frontend (inyectadas via Vite)
# ═══════════════════════════════════════════════════════════
VITE_API_BASE_URL="/api"
VITE_API_KEY="tu-api-key"
VITE_ENCRYPTION_KEY="misma-que-ENCRYPTION_KEY"

# ═══════════════════════════════════════════════════════════
# Email (SMTP) - opcional
# ═══════════════════════════════════════════════════════════
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="user@example.com"
SMTP_PASS="password"
SMTP_FROM="Academia PayGas <noreply@example.com>"
SMTP_SECURE="true"

# ═══════════════════════════════════════════════════════════
# Aplicacion
# ═══════════════════════════════════════════════════════════
APP_URL="https://academia.paygas.com.br"
PORT=3001
```

### Generar Claves Seguras

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Configurar Base de Datos

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Ver datos con Prisma Studio
npx prisma studio

# Reset y seed (solo desarrollo)
pnpm db:reset
```

---

## Seguridad

### Medidas Implementadas

| Medida | Estado | Descripcion |
|--------|--------|-------------|
| Helmet | ✅ | Headers de seguridad HTTP |
| CORS | ✅ | Whitelist de dominios configurada |
| Rate Limiting | ✅ | 200 req/15min global, 10 req/15min auth |
| JWT | ✅ | Sin fallback hardcoded, expira 24h |
| Encriptacion | ✅ | AES-256-GCM con PBKDF2 (100k iteraciones) |
| Bcrypt | ✅ | Salt rounds: 12 |
| SQL Injection | ✅ | Prisma ORM (parametros automaticos) |
| Error Handling | ✅ | Sin detalles de error al cliente |
| Paginacion | ✅ | Endpoints de listado limitados |

### Seguridad en Produccion

1. **NUNCA** commitee el archivo `.env`
2. Use claves generadas con `crypto.randomBytes(32)`
3. Configure `ALLOWED_ORIGINS` solo con dominios de produccion
4. Habilitar HTTPS obligatorio
5. Configurar `SMTP_SECURE="true"` para TLS

---

## API Endpoints

### Autenticacion

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/api/auth/login` | Iniciar sesion | Publico |
| GET | `/api/auth/me` | Obtener usuario actual | Autenticado |
| GET | `/api/auth/verify-email?token=xxx` | Verificar email | Publico |

### Usuarios

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/usuarios` | Listar usuarios (paginado) | Admin/Gestor |
| POST | `/api/usuarios` | Crear usuario | Admin/Gestor |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Admin |
| DELETE | `/api/usuarios/:id` | Eliminar usuario | Admin |
| GET | `/api/usuarios/equipe` | Obtener equipo | Admin/Gestor |
| POST | `/api/usuarios/:id/validate-account` | Validar cuenta | Admin/Gestor |
| POST | `/api/usuarios/:id/resend-verification` | Reenviar verificacion | Admin/Gestor |

### Modulos y Aulas

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/cms` | Listar modulos (paginado) | Admin/Gestor |
| POST | `/api/cms` | Crear modulo | Admin |
| PUT | `/api/cms/:id` | Actualizar modulo | Admin |
| DELETE | `/api/cms/:id` | Eliminar modulo | Admin |
| GET | `/api/modulos/:id/aulas` | Obtener aulas | Autenticado |
| POST | `/api/modulos/:id/aulas` | Crear aula | Admin |
| PUT | `/api/modulos/aulas/:id` | Actualizar aula | Admin |
| DELETE | `/api/modulos/aulas/:id` | Eliminar aula | Admin |

### Quizzes

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/api/modulos/:moduloId/quiz` | Crear quiz | Admin |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obtener quiz | Autenticado |
| PUT | `/api/modulos/quiz/:quizId` | Actualizar quiz | Admin |
| DELETE | `/api/modulos/quiz/:quizId` | Eliminar quiz | Admin |
| POST | `/api/modulos/quiz/:quizId/perguntas` | Agregar pregunta | Admin |
| PUT | `/api/modulos/perguntas/:perguntaId` | Actualizar pregunta | Admin |
| DELETE | `/api/modulos/perguntas/:perguntaId` | Eliminar pregunta | Admin |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respuestas | Autenticado |
| GET | `/api/modulos/quiz/:quizId/resultados` | Ver resultados | Autenticado |

### Progreso

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/progresso` | Obtener progreso | Autenticado |
| PUT | `/api/progresso` | Actualizar progreso | Autenticado |
| GET | `/api/progresso/stats` | Estadisticas | Autenticado |

### Certificados

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/certificates` | Listar certificados (paginado) | Autenticado |
| POST | `/api/certificates` | Solicitar certificado | Autenticado |
| PUT | `/api/certificates/:id/approve` | Aprobar certificado | Admin |
| PUT | `/api/certificates/:id/issue` | Emitir certificado | Admin |

### Notificaciones

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/notifications` | Listar notificaciones | Autenticado |
| POST | `/api/notifications` | Crear notificacion | Admin/Gestor |
| PUT | `/api/notifications/:id/read` | Marcar como leida | Autenticado (propietario) |
| PUT | `/api/notifications/read-all` | Marcar todas como leidas | Autenticado |

### Dashboard y Gamificacion

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/dashboard` | Datos del dashboard | Autenticado |
| GET | `/api/dashboard/leaderboard` | Leaderboard del equipo | Autenticado |
| POST | `/api/modulos/:id/open` | Registrar apertura | Autenticado |
| GET | `/api/modulos/gamification/leaderboard` | Top 20 usuarios | Autenticado |
| GET | `/api/modulos/gamification/stats` | Estadisticas globales | Autenticado |

### Sistema

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/health` | Health check | Publico |
| GET | `/api/docs` | Documentacion JSON | Publico |
| GET | `/api/docs/json` | Spec OpenAPI | Publico |
| GET | `/api/docs/html` | Documentacion HTML | Publico |

### Paginacion

Los endpoints de listado soportan paginacion via query params:

```
GET /api/usuarios?page=1&limit=20
GET /api/cms?page=2&limit=10
GET /api/certificates?page=1&limit=50
```

Respuesta:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Funcionalidades Principales

### 1. Sistema de Modulos

Estructura jerarquica de contenido:

```
Modulo
  ├── Aula #1 (Video YouTube con marcas de tiempo)
  │    └── Quiz (Opcional)
  ├── Aula #2
  │    └── Quiz
  └── Aula #N
```

### 2. Contenido Multimedia

- **Videos YouTube** - Embeds con marcas de tiempo (inicio/fin)
- **PDFs** - Documentos para visualizar
- **Textos** - Contenido formateado

### 3. Cuestionarios y Certificacion

- Preguntas de opcion multiple (A, B, C, D)
- Calificacion automatica (0-10)
- Puntuacion minima: 7 para aprobacion
- Certificacion automatica (configurable por quiz)
- Estados: PENDING → APPROVED → ISSUED

### 4. Gamificacion

| Accion | XP |
|--------|-----|
| Login diario | +10 |
| Abrir modulo | +20 |
| Completar aula | +50 |
| Completar modulo | +150 |
| Respuesta correcta | +30 |
| Aprobar quiz | +100 |
| Obtener certificado | +500 |

Nivel = `Math.floor(xp / 2000) + 1`

### 5. Soporte Offline

- Cache local con Dexie.js (IndexedDB)
- Cola de sincronizacion para operaciones offline
- Auto-sync cada 30 segundos cuando hay conexion
- Maximo 5 reintentos por item

### 6. Autenticacion y Autorizacion

| Rol | Permisos |
|-----|----------|
| ADMIN | Acceso total (CRUD usuarios, contenido, CMS) |
| GESTOR | Gestionar equipo, ver reportes |
| ATENDENTE | Ver modulos, completar aulas, quizzes |

---

## Desarrollo

### Comandos Principales

```bash
# Desarrollo
pnpm dev                    # Servidor + cliente
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
pnpm db:push                # Push schema sin migracion

# Codigo
pnpm lint                   # Ejecutar ESLint
npx tsc --noEmit            # Type checking

# Produccion
pnpm start                  # Iniciar servidor
pnpm start:prod             # Iniciar con NODE_ENV=production

# cPanel
pnpm cpanel:build           # Build para cPanel
```

### Estructura de Codigo

**Patrones:**
- TypeScript strict mode (frontend)
- Componentes funcionales React con hooks
- Manejo explicito de errores
- Respuestas JSON estandarizadas
- Encriptacion de payloads sensibles

---

## Deployment

### Produccion (cPanel)

```bash
# Build
pnpm cpanel:build

# Subir archivos via FTP/SFTP
# - dist/ (frontend)
# - server-build/ (backend compilado)
# - node_modules/
# - package.json
# - .htaccess
# - .env (con credenciales de produccion)

# En cPanel:
# 1. Configurar Node.js App (version 22+)
# 2. Entry point: server-build/index.js
# 3. Variables de entorno en el panel
```

### Produccion (Vercel)

```bash
# Configurar variables de entorno en Vercel Dashboard
# El deploy es automatico via git push
```

### Variables de Entorno (Produccion)

| Variable | Obligatoria | Descripcion |
|----------|-------------|-------------|
| `DATABASE_URL` | Si | Conexion PostgreSQL |
| `JWT_SECRET` | Si | Clave JWT (generar con crypto) |
| `ENCRYPTION_KEY` | Si | Clave encriptacion (generar con crypto) |
| `VITE_ENCRYPTION_KEY` | Si | Misma que ENCRYPTION_KEY |
| `ALLOWED_ORIGINS` | Si | Dominios CORS |
| `SMTP_*` | No | Configuracion email |
| `APP_URL` | No | URL de la aplicacion |
| `PORT` | No | Puerto (default: 3001) |

---

## Documentacion Adicional

- **[Agents](./agents.md)** - Arquitectura de agentes y diagramas de flujo
- **[Design](./design.md)** - Documento de diseno
- **[Deploy](./DEPLOY-CPANEL.md)** - Guia de deploy en cPanel

---

## Soporte y Contribucion

**Reportar Problemas**: [GitHub Issues](https://github.com/Dev-OlaMulticom/academia-paygas/issues)

**Pull Requests**: Bienvenidos!
1. Cree rama feature (`git checkout -b feature/AmazingFeature`)
2. Commit sus cambios (`git commit -m 'Add AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abra un Pull Request

---

## Licencia

Propiedad de PayGas. Solo para uso interno.

---

## Contacto

**Email Admin**: 24hwww@gmail.com
**Proyecto**: Academia PayGas
**Estado**: En Produccion

---

**Ultima actualizacion**: 2026-06-18
**Version**: 0.1.0
**Auditado por**: Ingeniero de Software especialista
