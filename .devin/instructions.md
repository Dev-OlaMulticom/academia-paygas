# Instructions — Políticas del Agente

> **Centralized documentation:** All agent documentation lives in `.ai/`.
>
> - Architecture: [`../.ai/architecture.md`](../.ai/architecture.md)
> - Coding Rules: [`../.ai/coding-rules.md`](../.ai/coding-rules.md)
> - Workflow: [`../.ai/workflow.md`](../.ai/workflow.md)
> - Task Master: [`../.ai/taskmaster.md`](../.ai/taskmaster.md)
> - Memory: [`../.ai/memory.md`](../.ai/memory.md)
> - Testing: [`../.ai/testing.md`](../.ai/testing.md)

## 🎯 Principios fundamentales

Como agente SWE-1.6 para Academia PayGas, debes:

1. **Priorizar la calidad sobre la velocidad**: Es mejor hacer bien las cosas que hacerlas rápido pero mal
2. **Reutilizar antes de crear**: Siempre buscar código existente antes de escribir nuevo código
3. **Respetar la arquitectura**: No reinventar ruedas, seguir patrones establecidos
4. **Documentar decisiones**: Cada decisión técnica importante debe ser documentada
5. **Verificar continuamente**: Tests, lint, typecheck en cada cambio significativo

## 📋 Pre-flight checks

Antes de comenzar cualquier tarea, verificar:

### Entorno de desarrollo

```bash
# Verificar pnpm instalado
pnpm --version

# Verificar dependencias instaladas
pnpm install

# Verificar archivo .env existe
ls .env
```

### Herramientas CLI

```bash
# Verificar ripgrep (búsqueda de texto)
rg --version

# Verificar fd (búsqueda de archivos)
fd --version

# Verificar TypeScript
npx tsc --version

# Verificar Prisma
npx prisma --version
```

### Estado del proyecto

```bash
# Verificar estado de git
git status

# Verificar si hay cambios sin commit
git diff

# Verificar lint status
pnpm lint
```

## 🔍 Proceso de análisis

### 1. Comprender el objetivo

Antes de escribir código, asegúrate de entender:

- **Qué** se quiere lograr
- **Por qué** se quiere lograr (contexto de negocio)
- **Cómo** afecta al sistema existente
- **Qué** dependencias tiene

### 2. Consultar la memoria del proyecto

Usar **codebase-memory-mcp** para:

- Buscar arquitectura existente
- Encontrar componentes reutilizables
- Identificar patrones del proyecto
- Localizar código relacionado

**Comandos prioritarios:**

```typescript
// 1. Buscar funciones/clases/rutas
mcp_call_tool("codebase-memory-mcp", "search_graph", {
  query: "termino de búsqueda",
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})

// 2. Trazar dependencias
mcp_call_tool("codebase-memory-mcp", "trace_path", {
  function_name: "nombre_funcion",
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  mode: "calls"
})

// 3. Obtener código fuente
mcp_call_tool("codebase-memory-mcp", "get_code_snippet", {
  qualified_name: "nombre_calificado",
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})

// 4. Obtener arquitectura general
mcp_call_tool("codebase-memory-mcp", "get_architecture", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})
```

**Fallback SOLO cuando:**
- Buscar string literals, error messages, config values
- Buscar archivos no-código (Dockerfiles, shell scripts)
- MCP tools retornan resultados insuficientes

### 3. Buscar código relacionado

Usar herramientas de búsqueda en orden de prioridad:

1. **codebase-memory-mcp** (primero, siempre)
2. **rg** (ripgrep) para búsqueda de texto
3. **fd** para búsqueda de archivos
4. **ast-grep** para refactorizaciones
5. **LSP** para navegación de símbolos

**NUNCA usar:**
- `grep` (usar `rg` en su lugar)
- `find` (usar `fd` en su lugar)

### 4. Analizar impacto

Considerar:

- **Backward compatibility**: ¿Esto rompe algo existente?
- **Performance**: ¿Impacta el rendimiento?
- **Security**: ¿Introduce vulnerabilidades?
- **Database**: ¿Requiere migrations?
- **Frontend/Backend**: ¿Afecta ambos lados?
- **Documentation**: ¿Requiere actualización de docs?

## 🎨 Estándares de código

### Estilo del proyecto

- **Linter**: Biome (configurado en `biome.json`)
- **Tabs vs Spaces**: Tabs
- **Quotes**: Double quotes
- **Trailing commas**: Yes
- **Line width**: 120 caracteres

### Conventions de nombres

- **UI strings**: Portugués (pt-BR)
- **Identificadores**: Portugués (`modulo`, `aula`, `licao`, `equipe`, `certificados`)
- **Funciones**: camelCase
- **Componentes**: PascalCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: kebab-case

### Patrones de React

- Usar componentes de `src/components/ui/` (shadcn/ui)
- Seguir patrones existentes en `src/pages/`
- Usar hooks personalizados de `src/hooks/`
- Evitar props drilling cuando sea posible

### Patrones de Express

- Todas las rutas bajo `/api/`
- Archivos de rutas en `server/routes/`
- Usar middleware de `server/middleware/`
- Nunca llamar `prisma.*` directamente en rutas (usar `server/lib/db.ts`)

## 🗄️ Base de datos

### Reglas de oro

1. **Nunca llamar prisma directamente en rutas**: Usar `server/lib/db.ts`
2. **Migrations requeridas**: Cualquier cambio de schema requiere migration
3. **Multi-database**: Considerar backup databases en writes
4. **DAL abstraction**: Usar `db.create()`, `db.findUnique()`, etc.

### Ejemplo correcto:

```typescript
// ✅ CORRECTO - usando DAL
import { db } from '../lib/db'

await db.create('user', { email, nome, senha })
await db.findUnique('user', { id: '123' })
```

### Ejemplo incorrecto:

```typescript
// ❌ INCORRECTO - prisma directo
import { prisma } from '../lib/prisma'

await prisma.user.create({ data: { email, nome, senha } })
```

## 🔐 Seguridad

### Nunca hacer

- Exponer secrets o tokens en código
- Desactivar middleware de autenticación
- Modificar políticas de seguridad
- Validar input en cliente solamente
- Usar SQL concatenado (usar Prisma)

### Siempre hacer

- Validar todas las entradas de usuario
- Usar consultas parametrizadas (Prisma)
- Implementar rate limiting cuando apropiado
- Sanitizar datos de usuario
- Usar HTTPS en producción

## 🧪 Verificación

### Comandos de verificación

```bash
# Lint
pnpm lint

# Typecheck frontend
npx tsc --noEmit

# Typecheck backend
npx tsc --project tsconfig.server.json --noEmit

# Build
pnpm build

# Database
npx prisma migrate deploy
```

### Cerrar tareas

Una tarea solo se considera completa cuando:

- ✅ El código compila sin errores
- ✅ Los tests pasan (si existen)
- ✅ El lint no tiene errores (warnings aceptables)
- ✅ Typecheck pasa sin errores
- ✅ Build funciona
- ✅ Documentation actualizada
- ✅ Memoria del proyecto actualizada

## 📝 Documentación

### Cuándo documentar

Documentar cuando:

- Se introduce un nuevo patrón
- Se modifica la arquitectura
- Se agrega una nueva feature significativa
- Se corrige un bug complejo
- Se cambia un comportamiento existente

### Dónde documentar

- **AGENTS.md**: Para cambios de arquitectura significativos
- **codebase-memory-mcp**: Para patrones reutilizables y decisiones técnicas
- **Comentarios en código**: Solo para lógica compleja (no obvia)
- **Commits**: Mensajes descriptivos siguiendo formato `tipo: descripcion`

## 🚫 Anti-patterns

### Evitar

- Código duplicado (DRY - Don't Repeat Yourself)
- Reinventar ruedas (reutilizar componentes existentes)
- Premature optimization (hacerlo simple primero)
- Over-engineering (soluciones simples cuando sea posible)
- Hardcoding (usar configuración/database cuando apropiado)
- Ignorar tipos (TypeScript es tu amigo)
- Comments obvios (el código debe hablar por sí mismo)

## 🔄 Depuración

### Estrategia

1. **Reproducir el problema** de forma confiable
2. **Trazar el flujo** de ejecución
3. **Agregar logging** temporal para aislar el issue
4. **Identificar la causa raíz** antes de arreglar
5. **Verificar el fix** realmente resuelve el problema
6. **Limpiar logging** temporal antes de commit

### Herramientas

- **Backend**: Logger Pino (configurado en `server/lib/logger.ts`)
- **Frontend**: Console.log (dev) + DevTools
- **Database**: Prisma Studio o queries directas
- **Network**: DevTools Network tab

## 🎯 Decisiones

### Antes de decidir

1. Consultar la memoria del proyecto
2. Buscar soluciones existentes
3. Considerar alternativas
4. Evaluar trade-offs
5. Documentar la decisión

### Después de decidir

1. Implementar la solución
2. Verificar que funciona
3. Documentar la decisión en memoria
4. Actualizar AGENTS.md si es necesario
5. Informar al usuario del impacto

## 📞 Comunicación

### Estilo

- **Conciso**: Ir al punto
- **Directo**: No rodeos
- **Honesto**: Admitir cuando no sé algo
- **Proactivo**: Sugerir mejorías cuando sea apropiado

### Cuándo preguntar

- Cuando los requisitos son ambiguos
- Cuando hay múltiples soluciones válidas
- Cuando el impacto es significativo
- Cuando hay riesgo de breaking changes
- Cuando no estoy seguro de la mejor aproximación

## 🏁 Conclusión

Seguir estas políticas asegura:

- Código de alta calidad
- Mantenibilidad a largo plazo
- Consistencia con el proyecto
- Seguridad y performance
- Documentación viva
- Productividad sostenible

**El backend es siempre la fuente de verdad.** El frontend es solo para UI hints, nunca para seguridad.
