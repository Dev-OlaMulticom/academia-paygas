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

### Perfil de Administrador

El perfil del admin (`/perfil`) incluye el bloque **Sandbox - Usuarios de Teste** que muestra los usuarios creados por el seed. Mismo estilo visual que los demas bloques del perfil (fondo blanco, borde gray-200).

| Rol | Avatar BG | Badge BG | Badge Text |
|-----|-----------|----------|------------|
| ADMIN | var(--pg-red) | var(--pg-red-lt) | var(--pg-red) |
| GESTOR | var(--pg-gold) | var(--pg-gold-lt) | var(--pg-gold) |
| ATENDENTE | var(--pg-green) | var(--pg-green-lt) | var(--pg-green) |

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

### Arquitectura de Red

**Produccion: nginx (cPanel default)**

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

**Flujo de una peticion API:**
1. Browser envia `GET https://academia.paygas.com.br/api/health`
2. nginx recibe en puerto 443 (SSL)
3. Snippet en include dir detecta `/api/` → proxy a `http://127.0.0.1:3001/api/health`
4. Express en puerto 3001 responde con JSON

**Flujo de una peticion frontend:**
1. Browser envia `GET https://academia.paygas.com.br/usuarios`
2. nginx recibe en puerto 443
3. No es `/api/` → `try_files` busca en `dist/`
4. No existe `/usuarios` → fallback a `dist/index.html` (SPA)

### Configuracion nginx (auto por deploy.sh)

`deploy.sh` paso 6c crea automaticamente un snippet de nginx en:
```
/etc/nginx/conf.d/users/olamulticomcom/academia.paygas.com.br.olamulticom.com.br/nodejs-app.conf
```

Este snippet se incluye en el server block del subdominio via `include` directive (sobrevive regeneraciones de config de cPanel).

El snippet contiene:
- `location /api/` → `proxy_pass http://127.0.0.1:3001`
- `location /` → `try_files $uri $uri/ /index.html` (SPA fallback)

### Estructura

```
/home/olamulticomcom/public_html/academia-paygas/
├── app.js                    # Entry point Passenger (NO usado por deploy.sh)
├── dist/                     # Frontend build + Backend compilado
│   ├── index.html            # React SPA
│   ├── assets/               # JS/CSS compilados
│   ├── server/               # Express compilado (index.js)
│   └── .htaccess             # SPA fallback (nginx lo ignora, sirve para Apache)
├── prisma/                   # Schema y migraciones
├── server/                   # Source TypeScript
├── node_modules/
├── .env                      # Variables de entorno
├── .htaccess                 # Seguridad (nginx lo ignora, sirve para Apache)
├── Passengerfile.json        # Config Passenger (no usado, cPanel lo genera)
├── setup-nginx.sh            # Configurar nginx snippet para Node.js
└── deploy.sh                 # Script de deploy con auto-reparacion

# Config nginx snippet (en servidor):
/etc/nginx/conf.d/users/olamulticomcom/academia.paygas.com.br.olamulticom.com.br/
└── nodejs-app.conf           # Proxy /api/ → Node.js + SPA fallback
```

### Deploy

```bash
# Automatico (detecta nginx, configura snippet, compila, reinicia)
./deploy.sh

# Configurar nginx manualmente (si deploy.sh no lo detecto)
sudo bash setup-nginx.sh

# Manual
git pull
npx prisma generate
npx prisma migrate deploy
npx vite build
npx tsc --project tsconfig.server.json
killall -9 node
PORT=3001 nohup node dist/server/index.js > logs/app.log 2>&1 &
```

### Proxy Reverso en nginx

El snippet `nodejs-app.conf` en el include dir de nginx configura el proxy:

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

**NOTA:** `.htaccess` NO funciona con nginx. Si el servidor usa nginx (cPanel default), las reglas proxy de `.htaccess` son ignoradas. El snippet de nginx reemplaza esa funcionalidad.

**Verificar que nginx sirve la app:**
```bash
# Test directo (Node.js activo)
curl -s http://127.0.0.1:3001/api/health

# Test via dominio (nginx proxy)
curl -s https://academia.paygas.com.br/api/health

# Verificar config nginx
nginx -t
```

### Notas Importantes

- `deploy.sh` ejecuta `node dist/server/index.js` directamente (NO Passenger)
- El servidor Node escucha en HTTP interno (puerto 3001), nginx maneja SSL
- **nginx NO lee `.htaccess`** — el snippet de nginx reemplaza esas reglas
- `app.js` y `Passengerfile.json` son para Phusion Passenger, `deploy.sh` no los usa
- Verificar despues del deploy: `curl https://academia.paygas.com.br/api/health` debe retornar JSON
- El snippet de nginx sobrevive regeneraciones de config de cPanel (esta en directorio include)
- cPanel genera nginx config automaticamente, pero no configura Passenger ni proxy a Node.js

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

1. Despues de cada cambio, hacer `git add` y `git commit` con mensaje descriptivo
2. Formato: `tipo: descripcion` (feat, fix, security, docs, chore, deploy)
3. No commitear archivos sensibles (.env, .pem)
4. Push solo cuando el working tree esta limpio

### IMPORTANTE: Siempre hacer commit despues de cada cambio

Despues de modificar cualquier archivo (configuracion, codigo, documentacion), **siempre hacer commit** para que el cambio quede registrado y pueda ser desplegado:

```bash
git add .
git commit -m "fix: agregar proxy reverso en .htaccess para /api/*"
git push
```

Sin commit, los cambios no se propagan al servidor y el deploy no los incluira.

### Seguridad Git

- `.env` esta en `.gitignore`
- Historial limpiado con BFG Repo Cleaner
- Credenciales rotadas despues de cualquier exposicion

---

*Ultima actualizacion: 2026-06-19*
*Version: 5.0*
