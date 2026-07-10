# Análisis del Repositorio — academia-paygas

> Informe generado a partir del índice de `codebase-memory-mcp` (3118 nodos / 6823 edges).

## 1. Resumen general

Plataforma de academia/LMS (cursos, aulas, quizzes, certificados, gamificación) con:

- **Frontend:** React + Vite + TypeScript (`src/`)
- **Backend:** Node/Express + TypeScript (`server/`) sobre Prisma (PostgreSQL + MySQL)
- **Plugin WordPress:** PHP (`wordpress-plugin-academia-paygas/`)
- **Datos:** Prisma con 19 migraciones

| Lenguaje | Archivos |
|---|---|
| TypeScript | 158 |
| SQL | 19 |
| PHP | 14 |
| Bash | 6 |
| JavaScript | 4 |
| YAML / HTML / CSS / TOML | 11 |

## 2. Arquitectura por capas

| Capa | Paquetes |
|---|---|
| **core (núcleo, alto fan-in)** | `lib` (305 in / 9 out), `config`, `auth`, `hooks` |
| **internal** | `components` (214 llamadas a `cn`), `reset-admin`, `seed`, `sync-mysql` |
| **entry (solo salida)** | `pages`, `services`, `middleware`, `api` |
| **api** | definiciones de rutas HTTP |

**Fronteras principales (call_count):**
- `components → lib` (214)
- `pages → hooks` (49)
- `services → lib` (36)
- `pages → lib` (33)
- `pages → components` (31)

## 3. Dominios (clusters detectados)

1. **UI base** (`src`, cohesión 0.93) — `cn`, `Item`, `Separator`, `Label`, `useCarousel`
2. **API cliente / imports** (`src`, 0.90) — `request`, `ExImpPage`, `handleImport`, `deriveKey`, `encrypt`
3. **Servidor / logging / email** (`server`+`src`+`prisma`, 0.92) — `info`, `sendEmail`, `error`, `getAll`, `runHealthChecks`
4. **CMS / certificados / módulos** (`src`+`server`, 0.92) — `useAbility`, `CertificadosPage`, `useAuth`, `defineAbility`, `ModulosListPage`
5. **Quizzes / lecciones** (`src`, 0.89) — `ModulosPage`, `resetLessonState`, `renderCertificateTab`, `handleInlineSubmit`, `renderQuizInAccordion`
6. **Componentes shadcn/ui** (`src`, 0.75) — `Root`, `RadioGroup`, `Avatar`, `Tabs`, `Switch`
7. **Plugin WordPress** (`wordpress-plugin-academia-paygas`, cohesión 1.0) — `register_routes`, `permission_callback`
8. **Auth/CASL** (`server`+`src`, 0.74) — `getModelDelegates`, `get`, `LoginPage`, `PasswordInput`, `resolveAulaId`

## 4. Puntos de entrada y API

- **Frontend:** `src/main.tsx` → `src/App.tsx`, `src/pages/*` (LoginPage, ModulosPage, CMSPage, QuizEditorPage, CertificadosPage…)
- **Backend:** `server/index.ts`, rutas en `server/routes/` (auth, cms, modules, quiz, certificates, forum, gamification, analytics, xpconfig, role-permissions, usuarios, public…)
- **Prisma scripts:** `prisma/seed.ts`, `prisma/reset-admin.ts`, `prisma/sync-mysql.ts`
- **Rutas quiz destacadas:** `/:cursoId/quiz`, `/quiz/:quizId/responder`, `/quiz/:quizId/resultados`, `/quiz/:quizId/perguntas`

## 5. Hotspots de complejidad (riesgo de mantenimiento)

| Función | Complejidad | Cognitiva | Loop depth |
|---|---|---|---|
| `ModulosPage.ModulosPage` | 85 | 129 | 1 |
| `CMSPage.CMSPage` | 36 | 56 | 1 |
| `UsuariosPage.UsuariosPage` | 30 | 44 | 0 |
| `QuizEditorPage.QuizEditorPage` | 31 | 41 | 0 |
| `NotifPage.NotifPage` | 20 | 35 | 0 |
| `ExImpPage.ExImpPage` | 27 | 35 | 0 |
| `prisma.seed.main` | 19 | 34 | 2 |
| `LogsPage.LogsPage` | 21 | 33 | 1 |
| `LoginPage.LoginPage` | 23 | 29 | 0 |
| `server.services.email.sendEmail` | 10 | 26 | 1 |
| `wordpress-plugin ... documentation handler` | 11 | 25 | 3 |

> **Observación:** `ModulosPage` es un "componente dios" (85 ciclos / 129 cognitiva) que concentra toda la lógica de quizzes, lecciones y certificados. Es el principal candidato a refactor (separar quiz, lección y certificado en hooks/subcomponentes).

## 6. Funciones más acopladas (fan-in)

- `cn` (utils) — 214
- `ApiClient.request` — 99
- `logger.error` — 38
- `use-toast.toast` — 33
- `calendar.Root` — 27
- `db.findUnique` / `db.update` / `db.findMany` / `db.create` — 19–24

## 7. Estado de calidad y correcciones recientes

- **Último commit:** `02c601a` — fix de quiz (mostrar cantidad de respuestas necesarias para aprobar + no ocultar el desglose correcto/incorrecto).
- El indicador por pregunta (✓/✗ + respuesta correcta) ya estaba implementado en los 4 flujos del quiz (`ModulosPage.tsx`).
- El plugin WordPress tiene cohesión perfecta (1.0) y está bien aislado del resto.

## 8. Recomendaciones

1. **Dividir `ModulosPage`** en componentes/hooks especializados (quiz, lección, certificado) para reducir la complejidad cognitiva de 129.
2. **Extraer lógica de quiz** a un hook `useQuiz` reutilizable entre los 4 flujos (principal, accordion, modal, móvil), eliminando la duplicación de `handleSubmitQuiz` / `handleInlineSubmit`.
3. **Centralizar el textos** de UI (hoy mezcla PT/ES en algunas cadenas, ej. `quizPassText` en PT vs mensajes en ES).
4. **Cobertura de tests:** solo `tests/*.test.ts` (casl-shared, jwt-fallback). Añadir tests al flujo de corrección de quiz.
5. **`server/services/email.sendEmail`** con complejidad cognitiva 26 — revisar manejo de errores/attachments.
