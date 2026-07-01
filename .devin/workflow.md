# Workflow — Flujo de Desarrollo

## 🔄 Flujo estándar para cada solicitud

### Paso 1: Comprender el objetivo

**Objetivo:** Entender completamente qué se quiere lograr y por qué.

**Acciones:**
1. Leer la solicitud del usuario cuidadosamente
2. Identificar el objetivo principal
3. Preguntar aclaraciones si algo es ambiguo
4. Contextualizar con el conocimiento del proyecto

**Output:** Una declaración clara del objetivo en mis propias palabras.

---

### Paso 2: Consultar la memoria del proyecto

**Objetivo:** Usar codebase-memory-mcp para obtener contexto existente.

**Acciones:**
1. Buscar arquitectura relevante con `get_architecture`
2. Buscar componentes/patrones relacionados con `search_graph`
3. Trazar dependencias si es necesario con `trace_path`
4. Revisar decisiones previas similares

**Comandos MCP:**

```typescript
// Arquitectura general
mcp_call_tool("codebase-memory-mcp", "get_architecture", {
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})

// Búsqueda específica
mcp_call_tool("codebase-memory-mcp", "search_graph", {
  query: "término de búsqueda",
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})

// Trazar dependencias
mcp_call_tool("codebase-memory-mcp", "trace_path", {
  function_name: "nombre_funcion",
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas",
  mode: "calls"
})
```

**Output:** Contexto relevante del proyecto (arquitectura, patrones, componentes existentes).

---

### Paso 3: Buscar código relacionado

**Objetivo:** Encontrar código existente que pueda reutilizarse.

**Acciones:**
1. Usar `rg` para buscar string literals, error messages, config values
2. Usar `fd` para buscar archivos específicos
3. Usar `ast-grep` para refactorizaciones si es necesario
4. Usar `LSP` para navegación de símbolos

**Prioridad:**
1. codebase-memory-mcp (siempre primero)
2. rg (para búsqueda de texto)
3. fd (para búsqueda de archivos)
4. ast-grep (para refactorizaciones)
5. LSP (para símbolos)

**Output:** Lista de archivos y componentes relevantes que pueden reutilizarse.

---

### Paso 4: Analizar impacto

**Objetivo:** Evaluar el impacto del cambio en el sistema.

**Preguntas clave:**
- ¿Esto rompe backward compatibility?
- ¿Impacta el rendimiento?
- ¿Introduce vulnerabilidades de seguridad?
- ¿Requiere migrations de base de datos?
- ¿Afecta frontend y backend?
- ¿Requiere actualización de documentación?
- ¿Afecta otros módulos/features?

**Output:** Análisis de impacto con riesgos identificados.

---

### Paso 5: Crear o actualizar tareas

**Objetivo:** Usar Task Master AI para gestionar el trabajo.

**Acciones:**

```bash
# Si es una tarea nueva
npx task-master add-task \
  --title="Título descriptivo" \
  --description="Descripción detallada" \
  --priority=high|medium|low

# Si la tarea ya existe
npx task-master set-status --id=<id> --status=in-progress

# Para tareas complejas, descomponer
npx task-master expand --id=<id>
```

**Cuándo crear tareas:**
- Implementaciones grandes (más de 3 archivos o >100 líneas)
- Features significativas
- Refactorizaciones complejas
- Bug fixes no triviales

**Output:** Tarea creada/actualizada en Task Master AI.

---

### Paso 6: Elaborar un plan

**Objetivo:** Crear un plan detallado antes de escribir código.

**Estructura del plan:**

```markdown
## Plan para [Título]

### Objetivo
[Descripción clara del objetivo]

### Cambios requeridos
1. [Archivo 1]: [Descripción del cambio]
2. [Archivo 2]: [Descripción del cambio]
3. ...

### Riesgos
- [Riesgo 1]: [Mitigación]
- [Riesgo 2]: [Mitigación]

### Verificación
- [ ] Lint pasa
- [ ] Typecheck pasa
- [ ] Build funciona
- [ ] [Verificación específica]

### Orden de implementación
1. [Paso 1]
2. [Paso 2]
3. ...
```

**Output:** Plan detallado aprobado por el usuario.

---

### Paso 7: Implementar cambios pequeños y verificables

**Objetivo:** Implementar cambios incrementales con verificación continua.

**Estrategia:**
1. Dividir en cambios pequeños (1-2 archivos por iteración)
2. Implementar un cambio
3. Verificar que funciona
4. Commit (si aplica)
5. Repetir

**Verificación después de cada cambio:**

```bash
# Lint
pnpm lint

# Typecheck (si aplica)
npx tsc --noEmit
npx tsc --project tsconfig.server.json --noEmit

# Build (si aplica)
pnpm build
```

**Output:** Cambios implementados y verificados.

---

### Paso 8: Ejecutar validaciones

**Objetivo:** Asegurar que todo funciona correctamente.

**Validaciones:**

```bash
# 1. Lint
pnpm lint

# 2. Typecheck frontend
npx tsc --noEmit

# 3. Typecheck backend
npx tsc --project tsconfig.server.json --noEmit

# 4. Build
pnpm build

# 5. Database (si aplica)
npx prisma migrate deploy

# 6. Tests manuales (si aplica)
# - API health check
# - Flujo manual de la feature
```

**Output:** Todas las validaciones pasan.

---

### Paso 9: Actualizar documentación

**Objetivo:** Mantener la documentación actualizada.

**Documentación a actualizar:**

1. **AGENTS.md**: Si hay cambios de arquitectura significativos
2. **codebase-memory-mcp**: Registrar patrones reutilizables y decisiones
3. **Comentarios en código**: Solo para lógica compleja
4. **Commit messages**: Seguir formato `tipo: descripcion`

**Registro en codebase-memory-mcp:**

```typescript
// Registrar nuevo patrón
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  query: `
    CREATE (p:Pattern {
      name: "Nombre del patrón",
      description: "Descripción",
      files: ["archivo1.ts", "archivo2.ts"],
      use_case: "Cuándo usar este patrón"
    })
  `,
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})
```

**Output:** Documentación actualizada.

---

### Paso 10: Actualizar la memoria del proyecto

**Objetivo:** Registrar decisiones y patrones en codebase-memory-mcp.

**Qué registrar:**

1. **Decisiones técnicas**: Por qué se eligió una solución
2. **Patrones reutilizables**: Componentes que pueden reutilizarse
3. **Cambios de arquitectura**: Impacto en el diseño
4. **Lessons learned**: Qué funcionó, qué no

**Cómo registrar:**

```typescript
// Registrar decisión
mcp_call_tool("codebase-memory-mcp", "query_graph", {
  query: `
    CREATE (d:Decision {
      title: "Título de la decisión",
      context: "Contexto del problema",
      decision: "Decisión tomada",
      rationale: "Por qué esta decisión",
      alternatives: ["Alternativa 1", "Alternativa 2"],
      timestamp: datetime()
    })
  `,
  project: "home-soporte24hwww-Documentos-Repositorios-academia-paygas"
})
```

**Output:** Memoria del proyecto actualizada.

---

### Paso 11: Cerrar la tarea

**Objetivo:** Marcar la tarea como completada en Task Master AI.

**Acciones:**

```bash
# Marcar como completada
npx task-master set-status --id=<id> --status=done

# Verificar que todos los criterios se cumplen:
# ✅ Código compila
# ✅ Tests pasan (si existen)
# ✅ Lint sin errores
# ✅ Documentation actualizada
# ✅ Memoria actualizada
```

**Output:** Tarea cerrada en Task Master AI.

---

## 🚨 Manejo de errores

### Si algo falla

1. **Identificar el error**: Leer el mensaje de error cuidadosamente
2. **Trazar la causa**: Usar logging para aislar el problema
3. **Buscar soluciones**: Consultar memoria del proyecto, documentación
4. **Probar fixes**: Implementar cambios pequeños y verificar
5. **Documentar**: Registrar la solución en memoria

### Si hay bloqueos

1. **Informar al usuario**: Explicar el bloqueo claramente
2. **Sugerir alternativas**: Proponer caminos alternativos
3. **Registrar en Task Master**: Marcar tarea como blocked con notas
4. **Continuar con otras tareas**: Si hay trabajo paralelizable

---

## 🎯 Escenarios especiales

### Bug fixes

1. Reproducir el bug de forma confiable
2. Trazar el flujo para encontrar la causa raíz
3. Implementar el fix más mínimo posible
4. Agregar test/regresión si es posible
5. Verificar que no rompe nada más

### New features

1. Entender el requisito de negocio
2. Diseñar la solución minimal viable
3. Implementar incrementalmente
4. Verificar cada componente
5. Documentar la nueva feature

### Refactorings

1. Entender el código existente
2. Identificar oportunidades de mejora
3. Refactorizar en pasos pequeños
4. Verificar que el comportamiento no cambia
5. Actualizar tests si es necesario

### Database changes

1. Diseñar el cambio de schema
2. Crear migration
3. Aplicar migration en desarrollo
4. Actualizar código que usa el schema
5. Verificar backward compatibility
6. Documentar el cambio

---

## 📊 Métricas de éxito

Una implementación exitosa cuando:

- ✅ Objetivo original cumplido
- ✅ Código compila sin errores
- ✅ Lint pasa sin errores
- ✅ Typecheck pasa sin errores
- ✅ Build funciona
- ✅ No introduce regressiones
- ✅ Documentation actualizada
- ✅ Memoria del proyecto actualizada
- ✅ Tarea cerrada en Task Master AI

---

## 🔄 Iteración continua

El flujo es iterativo. Si en cualquier paso se descubre información nueva:

1. Revisar el plan
2. Actualizar la tarea en Task Master
3. Informar al usuario del cambio
4. Continuar con el flujo

La flexibilidad es clave para adaptarse a descubrimientos durante el desarrollo.
