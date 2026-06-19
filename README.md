# Academia PayGas - Sistema de Aprendizaje Empresarial

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-green)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Nhost-336791)](https://nhost.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748)](https://www.prisma.io/)

## Indice

- [Vision General](#vision-general)
- [Stack Tecnologico](#stack-tecnologico)
- [Alcance (Scope)](#alcance-scope)
- [Schema de Base de Datos](#schema-de-base-de-datos)
- [Comenzar Rapidamente](#comenzar-rapidamente)
- [Seguridad](#seguridad)
- [API Endpoints](#api-endpoints)
- [Sistema de Equipos](#sistema-de-equipos)
- [Gamificacion](#gamificacion)
- [Deployment](#deployment)

---

## Vision General

Plataforma de aprendizaje corporativo (LMS) para empleados de estaciones de gasolina PayGas. Ofrece cursos de entrenamiento, aulas, licoes, cuestionarios, certificacion y gamificacion.

### Estructura LMS

```
Curso (antes: "Modulos" en el CMS)
  └─ Aula
       └─ Licao (video, texto, o PDF)
```

- **Curso:** Un tema de aprendizaje completo (ej: "Excelencia en el Atendimento")
- **Aula:** Seccion dentro de un curso (ej: "Resolucion de Conflictos")
- **Licao:** Contenido individual dentro de una aula (ej: video de 5 min, texto, PDF)

### Caracteristicas

- Cursos con aulas y licoes
- Cuestionarios interactivos con evaluacion automatica
- Sistema de equipos (Gestor + Atendentes)
- Gamificacion (XP, niveles, leaderboard)
- Encriptacion AES-256-GCM para payloads
- Soporte offline con IndexedDB
- Activity logs para auditoria
- Deploy en cPanel con nginx
- Modulos de navegacion activables/desactivables por admin

---

## Alcance (Scope)

### Que cubre el sistema

| Area | Funcionalidad | Estado |
|------|--------------|--------|
| **Autenticacion** | Login, JWT, verificacion email, roles (ADMIN/GESTOR/ATENDENTE) | Activo |
| **Gestion de Usuarios** | CRUD usuarios, equipos, validacion de cuentas | Activo |
| **Cursos (LMS)** | Crear/editar cursos, aulas, licoes via CMS | Activo |
| **Aprendizaje** | Ver cursos, completar aulas, ver licoes | Activo |
| **Cuestionarios** | Quizzes con evaluacion automatica, reintentos | Activo |
| **Certificados** | Auto-generacion o aprobacion manual por gestor | Activo |
| **Gamificacion** | XP, niveles, leaderboard, conquistas | Activo |
| **Foro** | Publicar, comentar, likes | Activo |
| **Analitica** | Estadisticas de usuarios, modulos, personas, mapa | Activo |
| **Notificaciones** | In-app y email (Nodemailer) | Activo |
| **Dashboard** | Vista resumen para admin y gestores | Activo |
| **Activacion de Modulos** | Admin activa/desactiva secciones del sidebar | Activo |
| **Encriptacion** | AES-256-GCM para payloads cliente-servidor | Activo |
| **Offline Sync** | Cola de sincronizacion con IndexedDB | Activo |
| **Activity Logs** | Auditoria de acciones del sistema | Activo |

### Fuera de alcance

- Pagos o integracion con pasarela de pago
- Video hosting (usa URLs externas)
- Chat en tiempo real
- App movil nativa
- Multi-idioma (actualmente solo portugues)

---

## Schema de Base de Datos

### Diagrama de Relaciones

```
User ──┬── progressos ──── Progresso ──── Modulo ──── Aula ──── Licao
       ├── quizResponses ─ QuizResponse ─ Quiz ──── QuizPergunta
       ├── certificates ── Certificate ── Modulo
       ├── pointsTransactions (XP)
       ├── activityLogs
       ├── forumPosts ──── ForumPost
       └── notifications ── Notification

ModuleConfig (configuracion de modulos del sidebar)
```

### Modelos

#### User

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `email` | String (unique) | Email del usuario |
| `nome` | String | Nombre completo |
| `senha` | String | Password hasheada (bcrypt) |
| `role` | Role enum | ADMIN, GESTOR, ATENDENTE |
| `xp` | Int | Puntos de experiencia acumulados |
| `level` | Int | Nivel actual (calculado de xp) |
| `avatarUrl` | String? | URL del avatar |
| `state` | String? | Estado/region del usuario |
| `emailVerificado` | Boolean | Si verifico su email |
| `tokenVerificacao` | String? | Token para verificacion |
| `tokenExpiry` | DateTime? | Expiracion del token |
| `gestorId` | String? | FK al gestor que lo creo |
| `lastLogin` | DateTime? | Ultimo acceso |

**Relaciones:** `gestor` (self), `atendentes` (self), `progressos`, `quizResponses`, `certificates`, `sentNotifications`, `receivedNotifications`, `activityLogs`, `pointsTransactions`, `forumPosts`

**Indices:** `gestorId`

---

#### Modulo (Curso)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `titulo` | String | Nombre del curso |
| `descricao` | String | Descripcion del curso |
| `ordem` | Int | Orden de visualizacion |
| `videoUrl` | String? | URL video introductorio |
| `videoInicio` | Int? | Segundo inicio del video |
| `videoFim` | Int? | Segundo fin del video |
| `obrigatorio` | Boolean | Si es obligatorio |
| `autoCertificado` | Boolean | Certificado automatico al aprobar |

**Relaciones:** `aulas`, `progressos`, `certificates`

---

#### Aula

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `moduloId` | String | FK al curso padre |
| `titulo` | String | Nombre del aula |
| `descricao` | String | Descripcion |
| `ordem` | Int | Orden dentro del curso |
| `tipo` | AulaTipo enum | VIDEO, PDF, TEXTO |
| `videoUrl` | String? | URL del video |
| `pdfUrl` | String? | URL del PDF |
| `videoInicio` | Int? | Segundo inicio |
| `videoFim` | Int? | Segundo fin |
| `duracaoMin` | Int? | Duracion estimada (minutos) |
| `obrigatorio` | Boolean | Si es obligatoria |

**Relaciones:** `modulo`, `quiz` (1:1), `progressos`, `licoes`

**Indices:** `moduloId`

---

#### Licao

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `aulaId` | String | FK al aula padre |
| `titulo` | String | Nombre de la licao |
| `conteudo` | String? | Texto o URL del contenido |
| `tipo` | AulaTipo enum | VIDEO, PDF, TEXTO |
| `ordem` | Int | Orden dentro del aula |
| `duracaoMin` | Int? | Duracion estimada |

**Relaciones:** `aula`

**Indices:** `aulaId`

---

#### Quiz

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `aulaId` | String (unique) | FK al aula (1 quiz por aula) |
| `titulo` | String | Nombre del quiz |
| `autoGerarCertificado` | Boolean | Generar certificado al aprobar |

**Relaciones:** `aula`, `perguntas`, `responses`

**Indices:** `aulaId`

---

#### QuizPergunta

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `quizId` | String | FK al quiz |
| `pergunta` | String | Texto de la pregunta |
| `opcaoA` | String | Opcion A |
| `opcaoB` | String | Opcion B |
| `opcaoC` | String? | Opcion C (opcional) |
| `opcaoD` | String? | Opcion D (opcional) |
| `correta` | String | Respuesta correcta ('A','B','C','D') |
| `ordem` | Int | Orden en el quiz |

**Relaciones:** `quiz`

**Indices:** `quizId`

---

#### QuizResponse

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `quizId` | String | FK al quiz |
| `userId` | String | FK al usuario |
| `nota` | Int | Calificacion (0-10) |
| `total` | Int | Total de preguntas |
| `concluido` | Boolean | Si aprobo (nota >= 7) |

**Relaciones:** `quiz`, `user`

**Indices:** `quizId`, `userId`, `@@unique([quizId, userId])`

---

#### Progresso

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `moduloId` | String | FK al curso |
| `aulaId` | String | FK al aula |
| `userId` | String | FK al usuario |
| `concluido` | Boolean | Si completo la aula |

**Relaciones:** `modulo`, `aula`, `user`

**Indices:** `moduloId`, `aulaId`, `userId`, `@@unique([moduloId, aulaId, userId])`

---

#### Certificate

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `userId` | String | FK al usuario |
| `moduloId` | String | FK al curso |
| `status` | CertificateStatus enum | PENDING, APPROVED, ISSUED |
| `pdfUrl` | String? | URL del PDF generado |
| `htmlContent` | String? | HTML del certificado |
| `aprovadoPor` | String? | Quien aprobo |
| `aprovadoEm` | DateTime? | Fecha de aprobacion |

**Relaciones:** `user`, `modulo`

**Indices:** `userId`, `moduloId`

---

#### Notification

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `fromId` | String | FK emisor |
| `toId` | String | FK receptor |
| `titulo` | String | Titulo de la notificacion |
| `mensagem` | String | Mensaje |
| `lida` | Boolean | Si fue leida |

**Relaciones:** `from` (User), `to` (User)

**Indices:** `fromId`, `toId`

---

#### ActivityLog

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `userId` | String | FK al usuario |
| `acao` | String | Tipo de accion |
| `detalhes` | String? | Detalles adicionales |

**Relaciones:** `user`

**Indices:** `userId`, `createdAt`

---

#### PointsTransaction

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `userId` | String | FK al usuario |
| `action` | PointsAction enum | LOGIN, MODULE_OPEN, LESSON_COMPLETE, MODULE_COMPLETE, QUIZ_CORRECT, QUIZ_PASS, CERTIFICATE |
| `points` | Int | Puntos otorgados |
| `details` | String? | Detalles |

**Relaciones:** `user`

**Indices:** `userId`, `createdAt`, `action`

---

#### ForumPost

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `titulo` | String | Titulo del post |
| `conteudo` | String | Contenido |
| `tags` | String? | Tags separados por coma |
| `likes` | Int | Conteo de likes |
| `replies` | Int | Conteo de respuestas |
| `autorId` | String | FK al autor |

**Relaciones:** `autor` (User)

**Indices:** `autorId`

---

#### ModuleConfig

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | ID unico |
| `key` | String (unique) | Clave del modulo (ej: 'forum', 'analytics') |
| `label` | String | Nombre para mostrar |
| `enabled` | Boolean | Si esta activo |

**Uso:** Controla que secciones del sidebar estan visibles. El admin puede activar/desactivar modulos via `PUT /api/admin/modules/:key`.

---

### Enums

| Enum | Valores |
|------|---------|
| `Role` | ADMIN, GESTOR, ATENDENTE |
| `CertificateStatus` | PENDING, APPROVED, ISSUED |
| `AulaTipo` | VIDEO, PDF, TEXTO |
| `PointsAction` | LOGIN, MODULE_OPEN, LESSON_COMPLETE, MODULE_COMPLETE, QUIZ_CORRECT, QUIZ_PASS, CERTIFICATE |

---

## Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | React + TypeScript + Vite | 19 / 5.7 / 6.x |
| Estilos | TailwindCSS + Radix UI | 4.x |
| Backend | Express + Node.js | 5.x / 22+ |
| ORM | Prisma | 7.x |
| Base de datos | PostgreSQL (Nhost) | - |
| Auth | JWT + bcryptjs | - |
| Email | Nodemailer | 9.x |
| Seguridad | Helmet + express-rate-limit | 8.x |

---

## Comenzar Rapidamente

### Requisitos

- Node.js 22+
- pnpm
- PostgreSQL (local o Nhost)

### Instalacion

```bash
git clone https://github.com/Dev-OlaMulticom/academia-paygas.git
cd academia-paygas
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Preparar base de datos
npx prisma generate
npx prisma migrate deploy
npx prisma db seed  # Datos de prueba

# Iniciar
pnpm dev
```

### URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Health | http://localhost:3001/api/health |

---

## Seguridad

### Medidas Implementadas

| Medida | Descripcion |
|--------|-------------|
| JWT dinamico | Secret generado si es debil (min 32 chars) |
| Encryption key dinamica | Se genera en runtime si no existe en env |
| Rate limiting | 200 req/15min global, 10/15min auth, 5/hora registro |
| Tokens con expiracion | Verificacion de email expira en 24h |
| GESTOR restringido | Solo gestiona usuarios de su equipo |
| Health check limpio | No expone errores de base de datos |
| .htaccess | Bloquea node_modules, prisma, server, *.ts, configs (Apache only, nginx lo ignora) |
| .env protegido | En .gitignore, eliminado del historial con BFG |

### Variables de Entorno

```bash
# Base de datos (obligatorio)
DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"

# Seguridad (opcionales - se generan dinamicamente si no existen)
JWT_SECRET="tu-clave-jwt"
ENCRYPTION_KEY="tu-clave-encriptacion"

# CORS
ALLOWED_ORIGINS="https://academia.paygas.com.br,http://localhost:5173"

# Email (opcional)
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="user@example.com"
SMTP_PASS="password"
```

---

## API Endpoints

### Autenticacion

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/api/auth/login` | Iniciar sesion | Publico |
| GET | `/api/auth/me` | Usuario actual | Autenticado |
| GET | `/api/auth/verify-email?token=xxx` | Verificar email | Publico |
| GET | `/api/config` | Encryption key | Publico |

### Usuarios y Equipos

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/usuarios` | Listar usuarios | Admin/Gestor |
| POST | `/api/usuarios` | Crear usuario | Admin/Gestor |
| PUT | `/api/usuarios/:id` | Editar usuario | Admin/Gestor* |
| DELETE | `/api/usuarios/:id` | Eliminar usuario | Admin/Gestor* |
| GET | `/api/usuarios/equipe` | Ver equipo | Admin/Gestor |
| GET | `/api/usuarios/equipe/stats` | Stats equipos | Admin |
| POST | `/api/usuarios/:id/validate-account` | Validar cuenta | Admin/Gestor |

*\*GESTOR solo puede editar/eliminar usuarios de su equipo*

### Cursos y Aulas (antes: Modulos)

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/cms` | Listar cursos | Admin/Gestor |
| POST | `/api/cms` | Crear curso | Admin |
| PUT | `/api/cms/:id` | Editar curso | Admin |
| DELETE | `/api/cms/:id` | Eliminar curso | Admin |
| GET | `/api/modulos/:id/aulas` | Obtener aulas de un curso | Autenticado |
| POST | `/api/modulos/:id/aulas` | Crear aula en curso | Admin |
| POST | `/api/modulos/:id/aulas/:aulaId/licoes` | Crear licao en aula | Admin |
| PUT | `/api/modulos/licoes/:licaoId` | Editar licao | Admin |
| DELETE | `/api/modulos/licoes/:licaoId` | Eliminar licao | Admin |

### Modulos de Navegacion (Activacion/Desactivacion)

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/admin/modules` | Obtener estado de modulos | Autenticado |
| PUT | `/api/admin/modules/:key` | Activar/desactivar modulo | Admin |

### Quizzes

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/api/modulos/:moduloId/quiz` | Crear quiz | Admin |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obtener quiz | Autenticado |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respuestas | Autenticado |

### Progreso y Certificados

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/progresso` | Obtener progreso | Autenticado |
| PUT | `/api/progresso` | Actualizar progreso | Autenticado |
| GET | `/api/certificates` | Listar certificados | Autenticado |
| POST | `/api/certificates` | Solicitar certificado | Autenticado |

### Dashboard y Gamificacion

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/dashboard` | Datos dashboard | Autenticado |
| GET | `/api/dashboard/leaderboard` | Leaderboard | Autenticado |
| GET | `/api/modulos/gamification/leaderboard` | Top 20 | Autenticado |
| GET | `/api/modulos/gamification/stats` | Stats globales | Autenticado |

### Sistema

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/health` | Health check | Publico |
| GET | `/api/notifications` | Notificaciones | Autenticado |

---

## Sistema de Equipos

### Estructura

```
ADMIN
  ├── Gestor A
  │    ├── Atendente 1
  │    ├── Atendente 2
  │    └── Atendente 3
  └── Gestor B
       ├── Atendente 4
       └── Atendente 5
```

### Permisos por Rol

| Rol | Crear | Editar | Eliminar | Ver |
|-----|-------|--------|----------|-----|
| **ADMIN** | Todos | Todos | Todos | Todas las equipes |
| **GESTOR** | Solo ATENDENTE (auto-asociado) | Solo su equipo | Solo su equipo | Solo su equipo |
| **ATENDENTE** | Ninguno | Ninguno | Ninguno | Solo su perfil |

### Vista de Equipos

- **Admin**: Equipes agrupadas por gestor con estadisticas
- **Gestor**: Lista simple de sus atendentes con progreso

---

## Gamificacion

| Accion | XP |
|--------|-----|
| Login | +10 |
| Abrir modulo | +20 |
| Completar aula | +50 |
| Completar modulo | +150 |
| Respuesta correcta quiz | +30 |
| Aprobar quiz (nota >= 7) | +100 |
| Obtener certificado | +500 |
| Gestor crear usuario | +20 |
| Gestor validar cuenta | +50 |

**Nivel** = `Math.floor(xp / 2000) + 1`

### Usuarios de Prueba (Seed)

| Email | Rol | Password |
|-------|-----|----------|
| admin@paygas.com.br | ADMIN | 123456 |
| gestor@paygas.com.br | GESTOR | 123456 |
| atendente@paygas.com.br | ATENDENTE | 123456 |
| joao@paygas.com.br | ATENDENTE | 123456 |
| maria@paygas.com.br | ATENDENTE | 123456 |

---

## Deployment en cPanel

### Arquitectura de Red

```
Browser (HTTPS 443)
    │
    ▼
nginx (SSL termination)
    │
    ├── /api/* ──────────► reverse proxy ──► Node.js (HTTP 3001)
    │                                           └── Express API
    │
    └── /* (estaticos) ──► dist/ (React SPA via try_files)
```

nginx recibe todas las peticiones HTTPS. Las rutas `/api/*` se forwardan al backend Node.js en puerto 3001 via proxy reverso. El resto se sirve como archivos estaticos (React SPA).

### Script Automatico

```bash
./deploy.sh
```

El script:
1. Detecta nginx y auto-configura el snippet de proxy (paso 6c)
2. Mata todos los procesos Node viejos
3. Limpia cache y build anterior
4. Instala dependencias
5. Genera Prisma y migra (con auto-reparacion)
6. Compila frontend (Vite) y servidor (TypeScript)
7. Inicia Node.js en puerto 3001
8. Recarga nginx con el snippet de proxy
9. Verifica health check en `127.0.0.1:3001` y via dominio

### Configuracion nginx (auto)

`deploy.sh` crea automaticamente un snippet de nginx en:
```
/etc/nginx/conf.d/users/olamulticomcom/academia.paygas.com.br.olamulticom.com.br/nodejs-app.conf
```

Manualmente:
```bash
sudo bash setup-nginx.sh
```

### Manual

```bash
git pull
npx prisma generate
npx prisma migrate deploy
npx vite build
npx tsc --project tsconfig.server.json
killall -9 node
PORT=3001 nohup node dist/server/index.js > logs/app.log 2>&1 &
```

### Proxy Reverso en nginx

El snippet `nodejs-app.conf` configura el proxy:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
    proxy_connect_timeout 10s;
}

location / {
    root "/home/olamulticomcom/public_html/academia-paygas/dist";
    try_files $uri $uri/ /index.html;
}
```

**NOTA:** `.htaccess` NO funciona con nginx. El snippet de nginx reemplaza esa funcionalidad.

### Verificacion

```bash
# Directo al servidor Node (siempre funciona)
curl http://127.0.0.1:3001/api/health

# Via el dominio (requiere snippet nginx configurado)
curl https://academia.paygas.com.br/api/health

# Verificar config nginx
nginx -t
```

### Notas de Deploy

- `deploy.sh` ejecuta `node dist/server/index.js` directamente (NO Passenger)
- nginx maneja SSL, Node escucha en HTTP interno (puerto 3001)
- El snippet de nginx sobrevive regeneraciones de config de cPanel
- cPanel genera nginx config pero NO configura proxy a Node.js
- `app.js` es para Phusion Passenger, `deploy.sh` no lo usa

---

## Documentacion Adicional

- **[Agents](./agents.md)** - Arquitectura de agentes completa
- **[Deploy](./DEPLOY-CPANEL.md)** - Guia detallada de deploy en cPanel
- **[Seguridad](./SECURITY_CHANGES.md)** - Cambios de seguridad implementados

---

## Contacto

**Proyecto**: Academia PayGas
**Estado**: En Produccion
**URL**: https://academia.paygas.com.br

---

**Ultima actualizacion**: 2026-06-18
**Version**: 0.1.0
