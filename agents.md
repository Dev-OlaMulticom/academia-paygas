# Arquitectura de Agentes - Academia PayGas

## Descripcion General

Academia PayGas es una plataforma de aprendizaje corporativo para empleados de estaciones de gasolina PayGas. Utiliza una arquitectura modular con agentes que gestionan autenticacion, navegacion, aprendizaje, gamificacion, encriptacion y soporte offline.

---

## 1. Authentication Agent

**Responsable de:** Autenticacion, sesiones, verificacion de email y control de roles.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `src/hooks/useAuth.ts`, `server/routes/auth.ts`, `server/middleware/auth.ts` |
| **API** | `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/verify-email` |

### Seguridad

- **JWT_SECRET:** Generado dinamicamente si es debil (min 32 chars)
- **Rate limiting:** 10 intentos/15min en login
- **Bcrypt:** Salt rounds 12
- **Tokens de verificacion:** Expiran en 24 horas (`tokenExpiry`)

### Roles

| Rol | Permisos |
|-----|----------|
| **ADMIN** | CRUD completo, gestionar todos los usuarios y equipos |
| **GESTOR** | CRUD de su equipo (atendentes), gestionar contenido |
| **ATENDENTE** | Ver modulos, completar aulas, quizzes, certificados |

---

## 2. Team Management Agent

**Responsable de:** Gestion de equipos (gestor + atendentes), restriccion de acceso por equipo.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `server/routes/usuarios.ts`, `src/pages/UsuariosPage.tsx`, `src/pages/EquipePage.tsx` |
| **API** | `GET/POST/PUT/DELETE /api/usuarios`, `GET /api/usuarios/equipe`, `GET /api/usuarios/equipe/stats` |

### Reglas de Equipo

```
ADMIN
  ├── Ve TODAS las equipes (agrupadas por gestor)
  ├── Puede crear gestores, atendentes y admins
  ├── Puede asignar/desasignar gestor a atendentes
  └── Puede editar/eliminar cualquier usuario

GESTOR
  ├── Ve SOLO sus atendentes (gestorId = su id)
  ├── Solo puede crear ATENDENTE (se auto-asocia)
  ├── Solo puede editar/eliminar sus propios atendentes
  └── Puede validar cuentas y reenviar verificacion de sus atendentes

ATENDENTE
  ├── Ve solo su perfil y progreso
  └── No tiene acceso a gestion de usuarios
```

### Endpoints de Equipo

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/api/usuarios/equipe` | Gestor: sus miembros. Admin: todas las equipes | Admin/Gestor |
| GET | `/api/usuarios/equipe/stats` | Estadisticas de equipes | Admin |

---

## 3. Navigation Agent

**Responsable de:** Enrutamiento y control de acceso por rol.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `src/App.tsx`, `src/layouts/AppLayout.tsx` |

### Mapa de Rutas

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | DashboardPage | Autenticado |
| `/modulos` | ModulosListPage | Autenticado |
| `/modulo/:nombre` | ModulosPage | Autenticado |
| `/certificados` | CertificadosPage | Autenticado |
| `/equipe` | EquipePage | Gestor/Admin |
| `/usuarios` | UsuariosPage | Gestor/Admin |
| `/cms` | CMSPage | Gestor/Admin |
| `/cms/criar-modulo` | CriarModuloPage | Admin |
| `/relatorios` | RelatoriosPage | Gestor/Admin |
| `/notif` | NotifPage | Autenticado |
| `/perfil` | PerfilPage | Autenticado |

### Sidebar Adaptada por Rol

- **ADMIN**: Equipes, Usuarios, CMS, Relatorios
- **GESTOR**: Minha Equipe, Meu Time, CMS, Relatorios
- **ATENDENTE**: Solo contenido de aprendizaje

---

## 4. Learning Agent

**Responsable de:** Modulos, aulas, progreso y certificados.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `src/pages/ModulosListPage.tsx`, `src/pages/ModulosPage.tsx`, `server/routes/cms.ts`, `server/routes/progresso.ts` |
| **API** | `/api/cms/*`, `/api/modulos/*`, `/api/progresso/*`, `/api/certificates/*` |

### Jerarquia de Contenido

```
Modulo
  ├── Aula #1 (Video YouTube)
  │    └── Quiz (Opcional, 1:1)
  ├── Aula #2
  │    └── Quiz
  └── Aula #N
```

### Flujo de Aprendizaje

1. Ver modulos disponibles
2. Seleccionar modulo → Ver aulas
3. Completar aula → Actualizar progreso
4. En ultima aula → Quiz (si existe)
5. Quiz aprobado (nota >= 7) → Certificado automatico
6. Ver certificado emitido

---

## 5. Gamification Agent

**Responsable de:** Sistema de XP, niveles y leaderboard.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `server/services/gamification.ts` |
| **API** | `/api/modulos/gamification/*`, `/api/dashboard/leaderboard` |

### Sistema de XP

| Accion | XP |
|--------|-----|
| Login | +10 |
| Abrir modulo | +20 |
| Completar aula | +50 |
| Completar modulo | +150 |
| Respuesta correcta | +30 |
| Aprobar quiz | +100 |
| Obtener certificado | +500 |
| Crear usuario (gestor) | +20 |
| Validar cuenta (gestor) | +50 |

**Nivel** = `Math.floor(xp / 2000) + 1`

---

## 6. Quiz Agent

**Responsable de:** Cuestionarios y evaluacion automatica.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `server/routes/cms.ts` (endpoints), `src/pages/ModulosPage.tsx` (respuesta) |
| **API** | `/api/modulos/quiz/*`, `/api/modulos/perguntas/*` |

### Flujo

```
Quiz → Preguntas (A/B/C/D) → Calificacion automatica (0-10)
  ├── nota >= 7 → Aprobado → Certificado (si autoGerarCertificado)
  └── nota < 7 → Reprobado → Reintentar
```

---

## 7. Encryption Agent

**Responsable de:** Encriptacion AES-256-GCM de payloads cliente-servidor.

| Propiedad | Valor |
|-----------|-------|
| **Cliente** | `src/lib/crypto.ts` (Web Crypto API) |
| **Servidor** | `server/middleware/encryption.ts` |
| **Key** | Dinamica en runtime (generada o desde `ENCRYPTION_KEY`) |

### Flujo

```
Frontend: encrypt(body) → base64 → { encrypted: "..." }
  ↓
Backend: decrypt(base64) → JSON.parse(body)
```

- **Endpoint publico:** `GET /api/config` retorna la encryption key
- **Cliente obtiene key antes de login** (necesaria para encriptar credenciales)
- **PBKDF2:** 100,000 iteraciones, salt 64 bytes, IV 16 bytes

---

## 8. Offline Sync Agent

**Responsable de:** Cola de sincronizacion offline con IndexedDB.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `src/lib/sync.ts`, `src/lib/db.ts` (Dexie.js) |
| **Max reintentos** | 5 por item |
| **Auto-sync** | Cada 30 segundos |

---

## 9. Notification Agent

**Responsable de:** Notificaciones in-app y por email.

| Propiedad | Valor |
|-----------|-------|
| **Archivos** | `server/routes/notifications.ts`, `server/services/email.ts`, `src/pages/NotifPage.tsx` |
| **API** | `/api/notifications/*` |

---

## 10. Activity Log Agent

**Responsable de:** Registro de todas las actividades del sistema.

| Propiedad | Valor |
|-----------|-------|
| **Modelo** | `ActivityLog` en `prisma/schema.prisma` |
| **Captura** | CRUD de usuarios, login, progreso, quizzes, certificados |

### Actividades Registradas

| Actividad | Descripcion |
|-----------|-------------|
| Login | Acceso a la plataforma |
| Criar Usuario | GESTOR/ADMIN crea usuario |
| Editar Usuario | Cambios en perfil de usuario |
| Excluir Usuario | Eliminacion de usuario |
| Validar Conta | GESTOR valida email de atendente |
| Reenviar Verificacao | Reenvio de email de verificacion |
| Modulo Aberto | Apertura de modulo de aprendizaje |
| Aula Concluida | Completar una aula |
| Quiz Aprovado | Quiz con nota >= 7 |

---

## Seguridad del Sistema

### Medidas Implementadas

| Medida | Estado | Ubicacion |
|--------|--------|-----------|
| Helmet (security headers) | ✅ | `server/index.ts` |
| CORS whitelist | ✅ | `server/index.ts` |
| Rate limiting global (200/15min) | ✅ | `server/index.ts` |
| Rate limiting auth (10/15min) | ✅ | `server/index.ts` |
| Rate limiting registro (5/hora) | ✅ | `server/index.ts` |
| JWT secret dinamico si debil | ✅ | `server/middleware/auth.ts` |
| Encryption key dinamica en runtime | ✅ | `server/middleware/encryption.ts` |
| Tokens de verificacion con expiracion | ✅ | `prisma/schema.prisma` |
| GESTOR restringido a su equipo | ✅ | `server/routes/usuarios.ts` |
| Validacion de roles en creacion | ✅ | `server/routes/usuarios.ts` |
| Health check sin expone errores DB | ✅ | `server/index.ts` |
| .htaccess: bloquea archivos sensibles | ✅ | `.htaccess` |
| .env eliminado del historial git | ✅ | BFG Repo Cleaner |

### Variables de Entorno

| Variable | Obligatoria | Descripcion |
|----------|-------------|-------------|
| `DATABASE_URL` | Si | Conexion PostgreSQL (con `?sslmode=require` para Nhost) |
| `JWT_SECRET` | No* | Se genera dinamico si es debil o no existe |
| `ENCRYPTION_KEY` | No* | Se genera dinamica si no existe |
| `ALLOWED_ORIGINS` | Si | Dominios CORS |
| `SMTP_*` | No | Configuracion email |
| `APP_URL` | No | URL de la aplicacion |

---

## Deployment en cPanel

### Estructura

```
/home/usuario/public_html/academia-paygas/
├── app.js                    # Entry point Passenger
├── dist/                     # Frontend build + Backend compilado
├── prisma/                   # Schema y migraciones
├── server/                   # Source TypeScript
├── node_modules/
├── .env                      # Variables de entorno
├── .htaccess                 # Seguridad Apache
└── deploy.sh                 # Script de deploy
```

### Deploy

```bash
# Automatico (detecta ruta)
./deploy.sh

# Manual
git pull
npx prisma generate
npx prisma migrate deploy
npx vite build
npx tsc --project tsconfig.server.json
killall -9 node
PORT=3001 nohup node dist/server/index.js > logs/app.log 2>&1 &
```

### Notas Importantes

- **Passenger** ejecuta `app.js` como entry point
- `app.js` importa `dist/server/index.js` (Express compilado)
- `deploy.sh` mata TODOS los procesos Node viejos antes de iniciar
- Apache maneja SSL, Node escucha en HTTP interno (puerto 3001)
- **ModPagespeed Off** en `.htaccess` para evitar problemas con JS/CSS

---

## Flujo de Datos General

```
┌─────────────────────────────────────────┐
│           USUARIO (Frontend)             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
 Auth      Learning    Team
 Agent     Agent       Agent
    │          │          │
    └──────────┼──────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
Encryption  Gamification  Offline
 Agent      Agent        Sync Agent
    │          │          │
    └──────────┼──────────┘
               │
               ▼
        ┌──────────────┐
        │ Express API  │
        │ (REST)       │
        └──────┬───────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
PostgreSQL  Nodemailer  ActivityLog
 (Datos)    (Email)     (Auditoria)
```

---

## Comandos Utiles

```bash
# Desarrollo
pnpm dev                    # Servidor + cliente
pnpm dev:server             # Solo servidor
pnpm dev:client             # Solo cliente

# Build
pnpm build                  # Build completo
npx vite build              # Solo frontend
npx tsc --project tsconfig.server.json  # Solo servidor

# Base de datos
npx prisma generate         # Generar cliente
npx prisma migrate deploy   # Ejecutar migraciones
npx prisma db seed          # Poblar datos de prueba

# Produccion
./deploy.sh                 # Deploy completo en cPanel
```

### Usuarios de Prueba (Seed)

| Email | Rol | Password |
|-------|-----|----------|
| admin@paygas.com.br | ADMIN | 123456 |
| gestor@paygas.com.br | GESTOR | 123456 |
| atendente@paygas.com.br | ATENDENTE | 123456 |
| joao@paygas.com.br | ATENDENTE | 123456 |
| maria@paygas.com.br | ATENDENTE | 123456 |

---

## Flujo de Trabajo Git

### Reglas

1. Despues de cada cambio, crear commit coherente
2. Formato: `tipo: descripcion` (feat, fix, security, docs, chore, deploy)
3. No commitear archivos sensibles (.env, .pem)
4. Push solo cuando el working tree esta limpio

### Seguridad Git

- `.env` esta en `.gitignore`
- Historial limpiado con BFG Repo Cleaner
- Credenciales rotadas despues de cualquier exposicion

---

*Ultima actualizacion: 2026-06-18*
*Version: 4.0*
