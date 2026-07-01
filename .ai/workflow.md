# Workflow — Flujo de Desarrollo

## Flujo estándar para cada solicitud

### Paso 1: Comprender el objetivo

**Objetivo:** Entender completamente qué se quiere lograr y por qué.

**Acciones:**
1. Leer la solicitud del usuario cuidadosamente
2. Identificar el objetivo principal
3. Preguntar aclaraciones si algo es ambiguo
4. Contextualizar con el conocimiento del proyecto

---

### Paso 2: Consultar la memoria del proyecto

**Objetivo:** Usar codebase-memory-mcp para obtener contexto existente.

**Acciones:**
1. Buscar arquitectura relevante con `get_architecture`
2. Buscar componentes/patrones relacionados con `search_graph`
3. Trazar dependencias si es necesario con `trace_path`
4. Revisar decisiones previas similares

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

---

### Paso 5: Crear o actualizar tareas

**Objetivo:** Usar Task Master AI para gestionar el trabajo.

**Cuándo crear tareas:**
- Implementaciones grandes (más de 3 archivos o >100 líneas)
- Features significativas
- Refactorizaciones complejas
- Bug fixes no triviales

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

### Riesgos
- [Riesgo 1]: [Mitigación]

### Verificación
- [ ] Lint pasa
- [ ] Typecheck pasa
- [ ] Build funciona

### Orden de implementación
1. [Paso 1]
2. [Paso 2]
```

---

### Paso 7: Implementar cambios pequeños y verificables

**Objetivo:** Implementar cambios incrementales con verificación continua.

**Estrategia:**
1. Dividir en cambios pequeños (1-2 archivos por iteración)
2. Implementar un cambio
3. Verificar que funciona
4. Commit (si aplica)
5. Repetir

---

### Paso 8: Ejecutar validaciones

**Objetivo:** Asegurar que todo funciona correctamente.

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
```

---

### Paso 9: Actualizar documentación

**Objetivo:** Mantener la documentación actualizada.

**Documentación a actualizar:**
1. **AGENTS.md**: Si hay cambios de arquitectura significativos
2. **Comentarios en código**: Solo para lógica compleja
3. **Commit messages**: Seguir formato `tipo: descripcion`

---

### Paso 10: Cerrar la tarea

**Criterios de completitud:**
- ✅ Código compila sin errores
- ✅ Tests pasan (si existen)
- ✅ Lint sin errores
- ✅ Documentation actualizada
- ✅ Memoria actualizada

---

## Manejo de errores

### Si algo falla

1. **Identificar el error**: Leer el mensaje de error cuidadosamente
2. **Trazar la causa**: Usar logging para aislar el problema
3. **Buscar soluciones**: Consultar memoria del proyecto, documentación
4. **Probar fixes**: Implementar cambios pequeños y verificar
5. **Documentar**: Registrar la solución en memoria

### Si hay bloqueos

1. **Informar al usuario**: Explicar el bloqueo claramente
2. **Sugerir alternativas**: Proponer caminos alternativos
3. **Continuar con otras tareas**: Si hay trabajo paralelizable

---

## Escenarios especiales

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
