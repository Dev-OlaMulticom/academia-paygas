# 🎓 Academia PayGas - Sistema de Aprendizaje Empresarial

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-green)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Nhost-336791)](https://nhost.io/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748)](https://www.prisma.io/)

## 📋 Índice

- [Visión General](#visión-general)
- [Stack Tecnológico](#stack-tecnológico)
- [Comenzar Rápidamente](#comenzar-rápidamente)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración](#configuración)
- [API Endpoints](#api-endpoints)
- [Funcionalidades](#funcionalidades)
- [Desarrollo](#desarrollo)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Visión General

Academia PayGas es una plataforma **de aprendizaje corporativo** para educación y desarrollo de equipo. Ofrece un sistema completo de rutas de aprendizaje, módulos, lecciones con vídeos, cuestionarios interactivos, certificación y gamificación.

**Público objetivo**: Empleados de estaciones de gasolina PayGas que necesitan entrenamiento continuo en excelencia de servicio, operación de terminales, seguridad de datos, gestión financiera y liderazgo.

### Características Principales

✅ **Rutas de Aprendizaje** - 8 rutas estructuradas  
✅ **Contenido Multimedia** - Vídeos, PDFs, documentación  
✅ **Cuestionarios Interactivos** - Evaluación automática con certificación  
✅ **Gamificación** - XP, niveles, logros y ranking  
✅ **Autenticación** - JWT + control de acceso por perfil  
✅ **Email** - Notificaciones y certificados por SMTP  
✅ **Dashboard** - Progreso, estadísticas e informes  
✅ **Mobile Ready** - Interfaz responsiva con Tailwind CSS  

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - UI library
- **TypeScript 5.7** - Type safety
- **Vite** - Build tool  
- **TailwindCSS 4** - Styling
- **Radix UI** - Componentes accesibles
- **React Router 7** - Enrutamiento del lado del cliente
- **Zustand** - Gestión de estado
- **React Query** - Obtención de datos y caché

### Backend
- **Express.js 5** - Marco web
- **Node.js 24** - Runtime
- **TypeScript** - Backend seguro de tipos
- **Prisma 7** - ORM
- **PostgreSQL (Nhost)** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **Nodemailer** - Servicio de correo
- **Zod** - Validación de esquemas

### DevTools
- **ESLint** - Linting de código
- **TypeScript** - Type checking
- **tsx** - Ejecutor de TypeScript
- **Concurrently** - Ejecutar múltiples procesos

---

## 🚀 Comenzar Rápidamente

### Requisitos Previos
- Node.js 22+ 
- pnpm (o npm/yarn)
- Git

### Instalación

```bash
# Clone el repositorio
git clone https://github.com/Dev-OlaMulticom/academia-paygas.git
cd academia-paygas

# Instale dependencias
pnpm install

# Configure variables de entorno
cp .env.example .env
# Edite .env con sus credenciales

# Prepare la base de datos
npx prisma migrate deploy
npx prisma db seed  # (opcional)

# Inicie el servidor
pnpm dev
```

Navegue a:
- 🔧 **Frontend**: http://localhost:5173
- ⚙️ **Backend**: http://localhost:3001
- 📚 **API Docs**: http://localhost:3001/api/docs

---

## 📁 Estructura del Proyecto

```
academia-paygas/
├── server/                    # Backend Express
│   ├── index.ts              # Servidor principal
│   ├── lib/
│   │   ├── prisma.ts        # Cliente Prisma singleton
│   │   └── auth.ts          # Utilitarios de autenticación
│   ├── middleware/
│   │   ├── auth.ts          # JWT y autorización
│   │   ├── encryption.ts    # Payloads cifrados
│   │   └── errorHandler.ts  # Manejo de errores
│   ├── routes/
│   │   ├── auth.ts          # Login/logout
│   │   ├── usuarios.ts      # Gestionar usuarios
│   │   ├── trilhas.ts       # Rutas de aprendizaje
│   │   ├── cms.ts           # Módulos, lecciones, cuestionarios
│   │   ├── progreso.ts      # Seguimiento de progreso
│   │   ├── certificates.ts  # Certificados
│   │   ├── dashboard.ts     # Estadísticas
│   │   └── notifications.ts # Notificaciones
│   ├── services/
│   │   └── email.ts         # Envío de correos SMTP
│   └── utils/
│       └── queryParams.ts   # Utilitarios de parámetros
│
├── src/                      # Frontend React
│   ├── App.tsx              # Router principal
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── TrilhasPage.tsx
│   │   ├── ModulosPage.tsx
│   │   ├── CertificadosPage.tsx
│   │   └── ...
│   ├── components/          # Componentes React
│   ├── hooks/
│   │   └── useAuth.ts      # Hook personalizado de autenticación
│   └── types/              # Interfaces TypeScript
│
├── prisma/
│   ├── schema.prisma       # Definición del esquema
│   ├── migrations/         # Migraciones de bases de datos
│   └── seed.ts            # Script de inicialización
│
├── scripts/
│   └── test-crud.ts       # Pruebas CRUD
│
├── public/                # Activos estáticos
├── styles/                # CSS global
└── package.json
```

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL="postgres://user:pass@host:5432/dbname"

# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="user@example.com"
SMTP_PASS="password"
SMTP_FROM="noreply@example.com"
SMTP_SECURE="true"

# Autenticación
JWT_SECRET="your-secret-key"
ENCRYPTION_KEY="your-encryption-key"

# API
API_BASE_URL="https://api.example.com"
API_KEY="your-api-key"

# Frontend
VITE_API_BASE_URL="https://api.example.com"
VITE_API_KEY="your-api-key"
```

### Configurar Base de Datos

```bash
# Crear tablas desde el esquema
npx prisma migrate deploy

# Ver datos con Prisma Studio
npx prisma studio

# Reset y seed (solo desarrollo)
npm run db:reset
```

---

## 🔌 API Endpoints

### Autenticación
```
POST   /api/auth/login       # Login
GET    /api/auth/me          # Usuario actual
```

### Usuarios
```
GET    /api/usuarios                    # Listar usuarios
POST   /api/usuarios                    # Crear usuario
PUT    /api/usuarios/:id                # Actualizar usuario
DELETE /api/usuarios/:id                # Eliminar usuario
GET    /api/usuarios/equipe             # Miembros del equipo
```

### Rutas de Aprendizaje
```
GET    /api/trilhas                     # Listar rutas
POST   /api/trilhas                     # Crear ruta
PUT    /api/trilhas/:id                 # Actualizar ruta
DELETE /api/trilhas/:id                 # Eliminar ruta
GET    /api/trilhas/:id/modulos         # Módulos de una ruta
```

### Módulos y Lecciones
```
POST   /api/cms                         # Crear módulo
PUT    /api/cms/:id                     # Actualizar módulo
DELETE /api/cms/:id                     # Eliminar módulo
GET    /api/cms/:id/aulas               # Lecciones de un módulo
POST   /api/cms/:id/aulas               # Crear lección
PUT    /api/cms/aulas/:id               # Actualizar lección
DELETE /api/cms/aulas/:id               # Eliminar lección
```

### Cuestionarios
```
POST   /api/cms/:moduloId/quiz          # Crear cuestionario
GET    /api/cms/:moduloId/quiz/:aulaId  # Obtener cuestionario
PUT    /api/cms/quiz/:quizId            # Actualizar cuestionario
DELETE /api/cms/quiz/:quizId            # Eliminar cuestionario
POST   /api/cms/quiz/:quizId/perguntas  # Agregar pregunta
PUT    /api/cms/perguntas/:id           # Actualizar pregunta
POST   /api/cms/quiz/:quizId/responder  # Enviar respuestas
```

### Progreso
```
GET    /api/progreso                    # Progreso del usuario
PUT    /api/progreso                    # Actualizar progreso
GET    /api/progreso/stats              # Estadísticas
```

### Certificados
```
GET    /api/certificates                # Listar certificados
POST   /api/certificates                # Solicitar certificado
PUT    /api/certificates/:id/approve    # Aprobar certificado
PUT    /api/certificates/:id/issue      # Emitir certificado
```

### Dashboard e Informes
```
GET    /api/dashboard                   # Estadísticas del dashboard
GET    /api/notifications               # Notificaciones
```

---

## ✨ Funcionalidades Principales

### 1. Sistema de Rutas (Learning Paths)

**8 Rutas Disponibles:**
1. **Excelencia en el Servicio al Cliente** ✅ Obligatoria
2. **Sistema Cashback PayGas** ✅ Obligatoria
3. **Operación del Terminal** ✅ Obligatoria
4. **Integración vía API** ✅ Obligatoria
5. **LGPD y Seguridad de Datos** ✅ Obligatoria
6. **Gestión y KPIs de la Estación** 
7. **Liderazgo y Desarrollo del Equipo**
8. **Gestión Financiera de la Estación**

Cada ruta contiene múltiples módulos, y cada módulo contiene múltiples lecciones.

### 2. Contenido Multimedia
- **Vídeos YouTube** - Embeds con marcas de tiempo
- **PDFs** - Documentos para descargar
- **Textos** - Contenido formateado
- **Marcas de tiempo** - Inicio y fin de vídeos

### 3. Cuestionarios y Certificación
- **Preguntas de opción múltiple** (A, B, C, D)
- **Calificaciones automáticas** (0-10)
- **Puntuación mínima**: 7.0 para aprobación
- **Certificación automática** (opcional)
- **Emisión de diplomas** en PDF/HTML

### 4. Gamificación
```
Cálculo de XP del Usuario:
  Base = 150 XP por lección completada
       + 500 XP por certificado
```

| Perfil | XP Inicial |
|--------|-----------|
| Admin  | 8.500 |
| Gestor | 4.100 |
| Atendente | 2.400 |

**Logros Desbloqueables:**
- 🏆 Primera Lección
- 🔥 Maratonista (5 lecciones en 1 día)
- 📜 Certificador (1 certificado)
- 🌟 Trilhero (3 rutas)
- 🎯 Experto (10 en 3 cuestionarios)
- 👑 Ranker (Top 10 nacional)

### 5. Autenticación y Autorización

**Roles:**
- **ADMIN** - Acceso total (gestión de usuarios, contenido, informes)
- **GESTOR** - Gestiona su equipo de atendentes (gestión de equipo, informes)
- **ATENDENTE** - Estudia rutas (acceso al aprendizaje)

**Middleware JWT:**
```typescript
authenticate() - Valida token JWT
authorize('ADMIN', 'GESTOR') - Verifica permisos
```

### 6. Email y Notificaciones

**Eventos que disparan correos:**
- ✉️ Bienvenida (nuevo usuario)
- 🎓 Certificado emitido
- 📬 Notificaciones personalizadas

Implementado con **Nodemailer** + SMTP corporativo.

---

## 💻 Desarrollo

### Comandos Principales

```bash
# Iniciar en modo desarrollo
pnpm dev

# Solo servidor backend
pnpm dev:server

# Solo cliente frontend
pnpm dev:client

# Build para producción
pnpm build

# Linting
pnpm lint

# Type checking
npx tsc --noEmit

# Pruebas CRUD
npx tsx scripts/test-crud.ts
```

### Estructura de Código

**Patrones:**
- ✅ TypeScript strict mode
- ✅ Componentes funcionales React con hooks
- ✅ Manejo explícito de errores
- ✅ Validación con Zod
- ✅ Respuestas JSON estandarizadas

---

## 🧪 Testing

### Ejecutar Pruebas CRUD

```bash
npx tsx scripts/test-crud.ts
```

**Lo que se prueba:**
✅ CREATE - Crear usuarios, rutas, módulos, lecciones, cuestionarios  
✅ READ - Buscar registros en la base de datos  
✅ UPDATE - Actualizar datos  
✅ DELETE - Eliminar registros  
✅ RELATIONSHIPS - Relaciones entre tablas  

---

## 📊 Esquema de Datos

### Modelos Principales

```prisma
User (Usuario)
Trilha (Ruta de Aprendizaje)
Modulo (Módulo)
Aula (Lección)
Quiz (Cuestionario)
QuizPergunta (Pregunta del Cuestionario)
QuizResponse (Respuesta del Usuario)
Progresso (Progreso)
Certificate (Certificado)
Notification (Notificación)
ActivityLog (Registro de Actividad)
```

Total de **13 modelos** relacionados para gestionar todo el sistema de aprendizaje corporativo.

---

## 🚀 Deployment

### Producción

```bash
# Build
pnpm build

# Iniciar servidor
node dist/server.js
```

### Variables de Entorno (Producción)

```bash
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=... (use generadores fuertes)
ENCRYPTION_KEY=... (use AES-256-GCM)
SMTP_* = ... (sus datos SMTP)
```

### Consideraciones de Seguridad

✅ HTTPS obligatorio  
✅ JWT con expiración  
✅ Contraseñas con bcrypt (10+ rounds)  
✅ Payloads cifrados en tránsito  
✅ CORS configurado  
✅ Protección contra inyección SQL (Prisma)  

---

## 📚 Documentación Adicional

- **[Agents](./agents.md)** - Sistema de agentes
- **[Changelog](./CHANGELOG.md)** - Historial de cambios

---

## 🤝 Soporte y Contribución

**Reportar Problemas**: [GitHub Issues](https://github.com/Dev-OlaMulticom/academia-paygas/issues)

**Pull Requests**: ¡Bienvenidos! Por favor:
1. Cree rama feature (`git checkout -b feature/AmazingFeature`)
2. Commit sus cambios (`git commit -m 'Add AmazingFeature'`)
3. Push a la rama (`git push origin feature/AmazingFeature`)
4. Abra un Pull Request

---

## 📝 Licencia

Propiedad de OlaMulticom. Solo para uso interno.

---

## 📞 Contacto

**Email Admin**: 24hwww@gmail.com  
**Proyecto**: Academia PayGas  
**Estado**: 🟢 En Producción  

---

**Última actualización**: 2026-06-16  
**Versión**: 0.1.0  
**Mantenido por**: OlaMulticom & Copilot
