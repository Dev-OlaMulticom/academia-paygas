# Arquitectura de Agentes - Academia PayGas

## Descripción General

Academia PayGas utiliza una arquitectura modular de agentes para gestionar la interacción entre usuarios y las funcionalidades de la plataforma. Cada agente es responsable de un aspecto específico del sistema y se comunica con otros agentes a través de eventos, API REST y estado compartido.

---

## 1. Authentication Agent

**Responsable de:** Autenticación, gestión de sesiones y validación de permisos.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Primario |
| **Alcance** | Global |
| **Archivo Principal** | `src/hooks/useAuth.ts` |
| **Dependencias** | Ninguna |
| **API Endpoints** | `POST /api/auth/login`, `GET /api/auth/me` |

### Funcionalidades

- Login con email y contraseña
- Validación de token JWT
- Gestión de sesiones en localStorage
- Control de roles y permisos (ADMIN, GESTOR, ATENDENTE)
- Logout y limpieza de sesión

### Flujo de Autenticación

```
1. Usuario accede a /login
2. Completa formulario (email + contraseña)
3. POST /api/auth/login → backend valida credenciales
4. Backend retorna token JWT + usuario
5. Frontend almacena en localStorage (key: "user")
6. useAuth() hook proporciona contexto global
7. Redirige a /dashboard (página protegida)
```

### Estructura de Sesión (localStorage)

```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@paygas.com",
    "nombre": "Nombre del Usuario",
    "rol": "ATENDENTE|GESTOR|ADMIN",
    "xp": 2400,
    "nivel": 5,
    "token": "eyJhbGc..."
  }
}
```

### Roles y Permisos

| Rol | Permisos | XP Inicial |
|-----|----------|-----------|
| **ADMIN** | Crear/editar trilhas, módulos, gestionar usuarios, CMS completo | 8500 |
| **GESTOR** | Editar módulos de su gestoría, ver reportes, gestionar equipo | 4100 |
| **ATENDENTE** | Ver trilhas, completar aulas, hacer quizzes, ver certificados | 2400 |

---

## 2. Navigation Agent

**Responsable de:** Enrutamiento, control de acceso y navegación entre páginas.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Primario |
| **Alcance** | Global |
| **Archivo Principal** | `src/App.tsx` (React Router v6) |
| **Dependencias** | Authentication Agent |
| **Middleware** | Private routes, role-based redirects |

### Mapa de Rutas

| Ruta | Componente | Acceso | Descripción |
|------|-----------|--------|-------------|
| `/login` | LoginPage | Público | Página de login |
| `/` | DashboardPage | Autenticado | Panel principal |
| `/trilhas-aprendizado` | TrilhasPage | Autenticado | Lista de trilhas |
| `/trilhas-aprendizado/:trilhaId` | TrilhaModulosPage | Autenticado | Módulos de una trilha |
| `/modulo/:moduloNombre` | ModulosPage | Autenticado | Aulas y contenido |
| `/certificados` | CertificadosPage | Autenticado | Certificados emitidos |
| `/equipe` | EquipePage | Gestor/Admin | Gestión de equipo |
| `/relatorios` | RelatoriosPage | Gestor/Admin | Reportes y estadísticas |
| `/cms` | CMSPage | Admin | Gestión de contenido |
| `/cms/crear-modulo` | CriarModuloPage | Admin | Crear nuevo módulo |
| `/usuarios` | UsuariosPage | Admin | Gestión de usuarios |
| `/notif` | NotifPage | Autenticado | Notificaciones |
| `/perfil` | PerfilPage | Autenticado | Perfil del usuario |

### Flujo de Navegación

```
Acceso a ruta
  ↓
¿Token válido? → No → Redirige a /login
  ↓ Sí
¿Ruta requiere rol específico? → No → Carga componente
  ↓ Sí
¿Usuario tiene rol? → No → Redirige a /
  ↓ Sí
Carga componente con acceso
```

---

## 3. Learning Agent

**Responsable de:** Gestión de trilhas, módulos, aulas y progreso del estudiante.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Archivos Principales** | `src/pages/TrilhasPage.tsx`, `src/pages/TrilhaModulosPage.tsx`, `src/pages/ModulosPage.tsx` |
| **Dependencias** | Navigation Agent, Quiz Agent |
| **API Endpoints** | `/api/trilhas/*`, `/api/modulos/*`, `/api/progresso/*` |

### Jerarquía de Contenido

```
Trilha (Trilha de Aprendizado)
  ├── Modulo (Categoría dentro de la trilha)
  │    ├── Aula #1 (Video YouTube o PDF)
  │    │    └── Quiz? (Opcional, 1:1 con aula)
  │    │         └── Pregunta de opción múltiple
  │    ├── Aula #2
  │    │    └── Quiz?
  │    └── Aula #N
  └── [Siguiente Módulo]
```

### 8 Trilhas Disponibles

| ID | Nombre | Aulas | Obligatoria | Descripción |
|----|--------|-------|-------------|-------------|
| `atendimiento` | Excelencia en el Atendimiento | 6 | ✅ | Buenas prácticas de servicio al cliente |
| `cashback` | Sistema de Cashback PayGas | 5 | ✅ | Funcionamiento y beneficios del programa |
| `gestao` | Gestión y KPIs del Posto | 7 | ❌ | Indicadores clave y análisis de desempeño |
| `terminal` | Operación del Terminal | 4 | ✅ | Uso correcto del POS y terminales |
| `erp` | Integración vía API | 6 | ✅ | Conexión con sistemas empresariales |
| `lgpd` | LGPD y Seguridad de Datos | 3 | ✅ | Cumplimiento normativo y protección |
| `lideranca` | Liderazgo y Desarrollo de Equipo | 5 | ❌ | Gestión de personas y motivación |
| `financeiro` | Gestión Financiera del Posto | 4 | ❌ | Control de ingresos y gastos |

### Flujo de Aprendizaje (Estudiante)

```
1. Ver Trilhas (GET /api/trilhas)
   ↓
2. Seleccionar Trilha → Ver Módulos (GET /api/trilhas/:id/modulos)
   ↓
3. Abrir Módulo → Ver Aulas (GET /api/modulos/:id/aulas)
   ↓
4. Para cada Aula:
   - Mostrar contenido (video/PDF)
   - Botón "Siguiente Aula" o "Concluir"
   - Actualizar progreso (PUT /api/progresso)
   ↓
5. En última aula del módulo → Mostrar Quiz (si existe)
   ↓
6. Quiz completado:
   - Si nota >= 7: Aprobado ✅
   - Si autoGerarCertificado: Emitir automáticamente
   - Si nota < 7: Permitir reintentar
   ↓
7. Ver Certificado (GET /api/certificates)
```

### Endpoint de Progreso

**GET /api/progresso** - Obtiene progreso del usuario actual
```json
{
  "trilhasCompletadas": 2,
  "aulasTotales": 38,
  "aulasCompletadas": 15,
  "porcentajeTotal": 39.5,
  "certificadosEmitidos": 1,
  "proximasAulas": [...],
  "nivelActual": 5,
  "xpActual": 2450
}
```

---

## 4. Gamification Agent

**Responsable de:** Sistema de puntos (XP), niveles y logros.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Archivo Principal** | `src/hooks/useAuth.ts` (cálculo de XP) |
| **Dependencias** | Learning Agent, Quiz Agent |
| **Métrica** | XP (Experience Points) |

### Sistema de XP

| Acción | XP Ganado | Notas |
|--------|----------|-------|
| Completar aula | +50 XP | Sin quiz |
| Aprobar quiz (nota >= 7) | +100 XP | Basado en nota |
| Obtener certificado | +250 XP | Una sola vez por trilha |
| Subir de nivel | 1000 XP/nivel | Acumulativo |
| Completar trilha obligatoria | +500 XP | Bonus especial |

### 6 Conquistas (Achievements)

| Logro | Condición | Recompensa | Desbloquea |
|-------|-----------|-----------|-----------|
| 🎯 Primer Paso | Completar 1ª aula | +100 XP | Badge: "Iniciador" |
| 🏃 Maratonista | 5+ aulas en un día | +200 XP | Badge: "Rápido" |
| 📜 Certifier | Obtener 1 certificado | +250 XP | Badge: "Certificado" |
| 🗺️ Trilheiro | Completar 3 trilhas | +500 XP | Badge: "Explorador" |
| 🧠 Expert | Nota 10 en 3 quizzes | +300 XP | Badge: "Experto" |
| 🏆 Ranker | Estar en Top 10 nacional | +1000 XP | Badge: "Campeón" |

### Cálculo de Nivel

```javascript
// Nivel = Math.floor(xpTotal / 1000) + 1
// Nivel 1: 0-999 XP
// Nivel 2: 1000-1999 XP
// Nivel 3: 2000-2999 XP
// ...
// Nivel N: (N-1)*1000 XP
```

---

## 5. Quiz Agent

**Responsable de:** Creación, gestión y corrección de cuestionarios.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por aula/módulo |
| **Archivos Principales** | `src/pages/ModulosPage.tsx` (respuesta), `src/pages/CMSPage.tsx` (gestión) |
| **API Endpoints** | `/api/modulos/quiz/*`, `/api/modulos/perguntas/*` |
| **Dependencias** | Learning Agent |

### Endpoints de Quiz

| Método | Ruta | Descripción | Rol |
|--------|------|-----------|-----|
| POST | `/api/modulos/:moduloId/quiz` | Crear quiz | Admin |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obtener quiz | Cualquiera |
| PUT | `/api/modulos/quiz/:quizId` | Actualizar quiz | Admin |
| DELETE | `/api/modulos/quiz/:quizId` | Eliminar quiz | Admin |
| POST | `/api/modulos/quiz/:quizId/perguntas` | Añadir pregunta | Admin |
| PUT | `/api/modulos/perguntas/:perguntaId` | Actualizar pregunta | Admin |
| DELETE | `/api/modulos/perguntas/:perguntaId` | Eliminar pregunta | Admin |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respuestas | Estudiante |
| GET | `/api/modulos/quiz/:quizId/resultados` | Ver resultados | Estudiante |

### Estructura de Quiz

```json
{
  "id": "uuid",
  "aulaId": "uuid",
  "titulo": "Quiz - Excelencia en Atendimiento",
  "descripcion": "Valida conocimientos sobre atención al cliente",
  "autoGerarCertificado": true,
  "notaMinima": 7,
  "preguntas": [
    {
      "id": "uuid",
      "orden": 1,
      "texto": "¿Cuál es el primer paso para excelencia en atendimiento?",
      "opciones": {
        "A": "Escuchar activamente",
        "B": "Hablar rápido",
        "C": "Ignorar al cliente",
        "D": "Presionar venta"
      },
      "respuestaCorrecta": "A"
    }
  ]
}
```

### Flujo de Quiz

```
Estudiante abre última aula del módulo
  ↓
¿Existe quiz? → No → Mostrar "Módulo completado"
  ↓ Sí
Mostrar formulario de quiz
  ↓
Estudiante selecciona respuestas (A/B/C/D)
  ↓
Clica "Enviar Respuestas" → POST /api/modulos/quiz/:quizId/responder
  ↓
Backend calcula nota (0-10)
  ↓
nota >= notaMinima?
  ├─ Sí → Mostrar "Aprobado ✅"
  │        ↓
  │        autoGerarCertificado?
  │        ├─ Sí → POST /api/certificates (auto-emitir)
  │        └─ No → Notificar al administrador
  │
  └─ No → Mostrar "Reprobado ❌"
           ↓
           ¿Intentos restantes? → Sí → Permitir reintentar
```

### Gestión en CMS

```
Admin accede a /cms/crear-modulo
  ↓
1. Selecciona o crea un módulo
2. Añade aulas (videos/PDFs)
3. Clica "Crear Quiz" en aula específica
4. Modal: Título, auto-certificar, nota mínima
5. Añade preguntas: texto, opciones A/B/C/D, marca respuesta correcta
6. Guarda → Quiz vinculado a aula en BD
7. Quiz disponible cuando estudiante llega a esa aula
```

---

## 6. Notification Agent

**Responsable de:** Creación, almacenamiento y entrega de notificaciones.

| Propiedad | Valor |
|-----------|-------|
| **Tipo** | Sub-agente |
| **Alcance** | Por usuario |
| **Archivo Principal** | `src/pages/NotifPage.tsx` |
| **API Endpoints** | `/api/notifications/*` |
| **Dependencias** | Authentication Agent, Learning Agent |

### Tipos de Notificación

| Tipo | Evento Disparador | Contenido |
|------|------------------|----------|
| 📚 Nuevo Módulo | Admin publica módulo | "Nueva aula disponible: {nombre}" |
| ⬆️ Subida de Nivel | Usuario alcanza nivel X | "¡Subiste a nivel {nivel}!" |
| 📜 Certificado | Quiz aprobado | "Certificado emitido: {trilha}" |
| 🎯 Logro Desbloqueado | Condición cumplida | "Desbloqueaste: {logro}" |
| ⚠️ Sistema | Mantenimiento, actualizaciones | "Sistema en mantenimiento..." |

### Endpoint de Notificaciones

**GET /api/notifications** - Obtiene notificaciones del usuario
```json
{
  "notificaciones": [
    {
      "id": "uuid",
      "tipo": "CERTIFICADO",
      "titulo": "Certificado Emitido",
      "descripcion": "Has aprobado la trilha 'Excelencia en Atendimiento'",
      "leida": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "noLeidasCount": 3
}
```

### Endpoints Completos

| Método | Ruta | Descripción |
|--------|------|-----------|
| GET | `/api/notifications` | Listar notificaciones |
| POST | `/api/notifications` | Crear notificación |
| POST | `/api/notifications/:id/read` | Marcar como leída |
| POST | `/api/notifications/read-all` | Marcar todas como leídas |
| DELETE | `/api/notifications/:id` | Eliminar |

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
              ├─→ Learning Agent (Ver trilhas/módulos/aulas)
              │
              ├─→ Quiz Agent (Responder cuestionarios)
              │
              ├─→ Gamification Agent (Ganar XP, logros)
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

## Integración SMTP

Todas las notificaciones críticas son enviadas por email mediante **Nodemailer**:

```
Quiz Aprobado → Quiz Agent notifica
                     ↓
              Notification Agent (crea registro)
                     ↓
              Email Service (Nodemailer)
                     ↓
              SMTP (Credenciales en .env)
                     ↓
              Email al usuario ✉️
```

### Variables SMTP (.env)

```env
SMTP_HOST=mail.midominio.com
SMTP_PORT=587
SMTP_USER=notificaciones@midominio.com
SMTP_PASS=contraseña_segura
SMTP_FROM=Academia PayGas <notificaciones@midominio.com>
SMTP_SECURE=true
APP_URL=https://academia.paygas.com
```

---

## Persistencia de Datos

| Datos | Ubicación | Método | Agente Responsable |
|-------|-----------|--------|-------------------|
| Sesión de usuario | localStorage | Key: "user" | Authentication |
| Preferencias | localStorage | Key: "preferences" | Navigation |
| Progreso del estudiante | PostgreSQL (Progresso) | API REST | Learning |
| Quizzes y respuestas | PostgreSQL (Quiz, QuizResponse) | API REST | Quiz |
| XP y logros | PostgreSQL (User) | Calculado | Gamification |
| Notificaciones | PostgreSQL (Notification) | API REST | Notification |
| Certificados | PostgreSQL (Certificate) | API REST | Learning |

---

## Desarrollo e Integración

### Agregar un Nuevo Agente

1. Crear archivo en `src/hooks/useNewAgent.ts` o `src/services/NewAgent.ts`
2. Implementar interfaz y métodos principales
3. Conectar con componentes en `src/pages/`
4. Crear endpoints en `server/routes/newagent.ts`
5. Documentar en este archivo (agents.md)

### Testing de Agentes

Ejecutar tests unitarios:
```bash
npm run test
```

Ejecutar suite de CRUD:
```bash
npx ts-node scripts/test-crud.ts
```

---

## Referencias Rápidas

**Archivos Clave:**
- Authentication: `src/hooks/useAuth.ts`
- Navigation: `src/App.tsx`
- Learning: `src/pages/TrilhasPage.tsx`, `ModulosPage.tsx`
- Quiz: `server/routes/cms.ts`
- Notifications: `src/pages/NotifPage.tsx`
- Email: `server/services/email.ts`

**Variables de Entorno Críticas:**
- `DATABASE_URL` - PostgreSQL (Nhost)
- `JWT_SECRET` - Autenticación de tokens
- `ENCRYPTION_KEY` - Encriptación de datos
- `SMTP_*` - Email (Nodemailer)

---

*Última actualización: 2024*
*Versión de Documentación: 2.0*
