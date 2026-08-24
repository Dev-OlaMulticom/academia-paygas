# Memory — Uso de Memoria Persistente

## codebase-memory-mcp

codebase-memory-mcp es la herramienta principal para descubrir y mantener contexto del proyecto. Indexa el código en un grafo de conocimiento que permite consultas sobre arquitectura, dependencias, y patrones.

## Configuración

**Nombre del proyecto MCP:** `home-soporte24hwww-Documentos-Repositorios-academia-paygas`

## Herramientas disponibles

### 1. search_graph

Búsqueda de funciones, clases, rutas por patrón. Es la herramienta principal para descubrir código.

```typescript
mcp_call_tool("codebase-memory-mcp", "search_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: "término de búsqueda en lenguaje natural",
  name_pattern: ".*regex.*",  // Búsqueda por nombre exacto
  label: "Function",          // Filtrar por tipo (Function, Class, Route, etc.)
  file_pattern: "apps/web/src/**/*.ts", // Filtrar por archivo
  limit: 200,                 // Límite de resultados (default 200)
  offset: 0                   // Para paginación
})
```

**Modos de búsqueda:**
1. **query**: Búsqueda en lenguaje natural (BM25 ranking)
2. **name_pattern**: Búsqueda por regex exacto
3. **semantic_query**: Búsqueda semántica (vector cosine search)

**Prioridad de uso:**
1. `query` - para descubrimiento natural
2. `name_pattern` - para patrones específicos
3. `semantic_query` - para sinonimia/palabras clave

---

### 2. trace_path

Trazar callers/callees, flujo de datos, llamadas cross-service.

```typescript
mcp_call_tool("codebase-memory-mcp", "trace_path", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  function_name: "nombre_calificado de la función",
  mode: "calls",              // calls | data_flow | cross_service
  direction: "both",          // inbound | outbound | both
  depth: 3                   // Profundidad del trazo (default 3)
})
```

**Modos:**
- **calls**: Seguir edges CALLS (dependencias de función)
- **data_flow**: Seguir CALLS + DATA_FLOWS con expresiones de args
- **cross_service**: Seguir HTTP_CALLS + ASYNC_CALLS + DATA_FLOWS a través de Routes

---

### 3. get_code_snippet

Leer código fuente de una función/clase/símbolo.

```typescript
mcp_call_tool("codebase-memory-mcp", "get_code_snippet", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  qualified_name: "nombre_calificado",
  include_neighbors: false
})
```

**Nota:** Primero usar `search_graph` para obtener el `qualified_name`, luego pasarlo aquí.

---

### 4. query_graph

Ejecutar queries Cypher para patrones complejos, agregaciones, análisis cross-service.

```typescript
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: `
    MATCH (f:Function)
    WHERE f.transitive_loop_depth >= 3
    RETURN f.qualified_name, f.transitive_loop_depth
    ORDER BY f.transitive_loop_depth DESC
    LIMIT 10
  `,
  max_rows: 1000
})
```

**Propiedades útiles de Function:**
- `cyclomatic_complexity`: Complejidad ciclomática
- `cognitive_complexity`: Complejidad cognitiva
- `loop_count`: Cantidad de loops
- `loop_depth`: Profundidad máxima de nesting
- `transitive_loop_depth`: Peor caso nesting propagado
- `linear_scan_in_loop`: Scans O(n²) ocultos
- `alloc_in_loop`: Asignaciones en loops

---

### 5. get_architecture

Obtener overview de alto nivel del proyecto.

```typescript
mcp_call_tool("codebase-memory-mcp", "get_architecture", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})
```

---

### 6. index_repository

Indexar el repositorio en el grafo de conocimiento.

```typescript
mcp_call_tool("codebase-memory-mcp", "index_repository", {
  repo_path: "/home/soporte24hwww/Documentos/Repositorios/academia-paygas",
  mode: "full",  // full | moderate | fast | cross-repo-intelligence
  persistence: false
})
```

**Modos:**
- **full**: Todos los archivos + edges de similitud/semántica
- **moderate**: Archivos filtrados + similitud/semántica
- **fast**: Archivos filtrados, sin similitud/semántica
- **cross-repo-intelligence**: Solo match Routes/Channels cross-repo

**Cuándo reindexar:**
- Después de cambios significativos en arquitectura
- Cuando MCP tools retornan resultados insuficientes
- Cuando se agregan muchos archivos nuevos

---

## Prioridad de uso

### Para descubrir código

1. **search_graph** - Primero siempre
2. **trace_path** - Para entender dependencias
3. **get_code_snippet** - Para leer código específico
4. **query_graph** - Para patrones complejos
5. **get_architecture** - Para overview general

### Fallback a herramientas tradicionales

SOLO usar `rg`/`fd`/`ast-grep`/`LSP` cuando:
- Buscar string literals, error messages, config values
- Buscar archivos no-código (Dockerfiles, shell scripts)
- MCP tools retornan resultados insuficientes

---

## Casos de uso comunes

### Encontrar una función

```typescript
// 1. Buscar por nombre o descripción
mcp_call_tool("codebase-memory-mcp", "search_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: "login authentication"
})

// 2. Obtener código fuente
mcp_call_tool("codebase-memory-mcp", "get_code_snippet", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  qualified_name: "...server.routes.auth.login"
})
```

### Encontrar quién usa una función

```typescript
mcp_call_tool("codebase-memory-mcp", "trace_path", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  function_name: "db.create",
  mode: "calls",
  direction: "inbound",
  depth: 2
})
```

### Encontrar funciones complejas (hot-paths)

```typescript
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: `
    MATCH (f:Function)
    WHERE f.transitive_loop_depth >= 3 OR f.linear_scan_in_loop >= 1
    RETURN f.qualified_name, f.transitive_loop_depth, f.linear_scan_in_loop
    ORDER BY f.transitive_loop_depth DESC
    LIMIT 10
  `
})
```

---

## Registrar información en memoria

### Registrar decisiones técnicas

```typescript
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: `
    CREATE (d:Decision {
      title: "Título de la decisión",
      context: "Contexto del problema",
      decision: "Decisión tomada",
      rationale: "Por qué esta decisión",
      alternatives: ["Alternativa 1", "Alternativa 2"],
      timestamp: datetime(),
      files: ["archivo1.ts", "archivo2.ts"]
    })
  `
})
```

### Registrar patrones reutilizables

```typescript
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  query: `
    CREATE (p:Pattern {
      name: "Nombre del patrón",
      description: "Descripción",
      files: ["archivo1.ts", "archivo2.ts"],
      use_case: "Cuándo usar este patrón",
      gotchas: ["Gotcha 1", "Gotcha 2"]
    })
  `
})
```

---

## Mantenimiento de memoria

### Cuándo actualizar memoria

1. Después de cambios de arquitectura significativos
2. Al introducir nuevos patrones reutilizables
3. Al corregir bugs complejos con lessons learned
4. Al agregar nuevas features importantes
5. Al cambiar decisiones técnicas previas

### Cuándo reindexar

1. Después de reestructuración masiva de archivos
2. Cuando MCP tools retornan resultados desactualizados
3. Después de agregar >50 archivos nuevos
4. Cuando se cambia extensivamente el código base

---

## Limitaciones y gotchas

### Limitaciones conocidas

1. **Archivos grandes (>4MB)**: Skipped por MCP
2. **Paginación**: Resultados limitados a 200 por llamada, usar `offset` para más
3. **Lenguajes dinámicos**: Menos preciso que TypeScript
4. **Generated code**: Puede indexar código generado (filter con file_pattern)

### Gotchas específicos del proyecto

1. **Dos tsconfigs**: Frontend y backend tienen configs separadas
2. **Path aliases**: `@/*` → `./apps/web/src/*` solo en frontend
3. **Multi-database**: DAL abstraction layer en `apps/api/apps/web/src/server/lib/db.ts`
4. **No tests**: Verificación manual via API health check

---

## Best practices

### Antes de escribir código

1. **Siempre** consultar memoria primero
2. **Siempre** buscar patrones existentes
3. **Siempre** verificar si ya existe solución
4. **Siempre** entender arquitectura relevante

### Después de escribir código

1. **Siempre** registrar decisiones técnicas
2. **Siempre** registrar patrones reutilizables
3. **Siempre** documentar gotchas encontrados
4. **Siempre** actualizar memoria si cambió arquitectura

### Nunca

1. **Nunca** responder solo con contexto de conversación cuando memoria existe
2. **Nunca** confiar solo en memoria sin verificar código actual
3. **Nunca** registrar información trivial u obvia
4. **Nunca** reindexar innecesariamente (costoso)
