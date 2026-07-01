# Tasks — Gestión de Tareas con Task Master AI

## 🎯 Objetivo

Task Master AI gestiona el ciclo de vida de tareas, desde la planificación hasta el cierre. Las tareas viven en `.taskmaster/tasks/tasks.json` y archivos individuales en `.taskmaster/tasks/`.

## 📁 Estructura

```
.taskmaster/
├── tasks/
│   ├── tasks.json          # Lista principal de tareas
│   └── <task-id>.md       # Detalles individuales de cada tarea
└── docs/
    └── prd.md             # Product Requirements Document (opcional)
```

## 🔄 Flujo de trabajo

### 1. Crear tarea

**Cuándo crear una tarea:**
- Implementaciones grandes (>3 archivos o >100 líneas)
- Features significativas
- Refactorizaciones complejas
- Bug fixes no triviales
- Cambios que afectan múltiples módulos

**Comando:**

```bash
npx task-master add-task \
  --title="Título descriptivo" \
  --description="Descripción detallada del objetivo" \
  --priority=high|medium|low
```

**Ejemplo:**

```bash
npx task-master add-task \
  --title="Implementar sistema de notificaciones push" \
  --description="Agregar soporte para notificaciones push en tiempo real usando WebSockets" \
  --priority=high
```

---

### 2. Expandir tarea compleja

**Cuándo expandir:**
- Tarea tiene múltiples sub-tareas
- Requiere trabajo en paralelo
- Tiene dependencias entre pasos

**Comando:**

```bash
npx task-master expand --id=<task-id>
```

**Ejemplo:**

```bash
npx task-master expand --id=1
```

Esto descompone la tarea en subtareas manejables.

---

### 3. Seleccionar siguiente tarea

**Comando:**

```bash
npx task-master next
```

Muestra la siguiente tarea disponible para trabajar.

---

### 4. Marcar tarea en progreso

**Comando:**

```bash
npx task-master set-status --id=<id> --status=in-progress
```

**Ejemplo:**

```bash
npx task-master set-status --id=1 --status=in-progress
```

---

### 5. Trabajar en la tarea

Seguir el flujo definido en `workflow.md`:

1. Comprender el objetivo
2. Consultar la memoria
3. Buscar código relacionado
4. Analizar impacto
5. Elaborar un plan
6. Implementar cambios pequeños
7. Ejecutar validaciones
8. Actualizar documentación
9. Actualizar la memoria

---

### 6. Marcar subtareas completadas

Si la tarea fue expandida, marcar subtareas a medida que se completan:

```bash
npx task-master set-status --id=<subtask-id> --status=done
```

---

### 7. Cerrar tarea

**Criterios para cerrar:**

- ✅ El código compila sin errores
- ✅ Los tests pasan (si existen)
- ✅ El lint no tiene errores (warnings aceptables)
- ✅ Typecheck pasa sin errores
- ✅ Build funciona
- ✅ Documentation actualizada
- ✅ Memoria del proyecto actualizada

**Comando:**

```bash
npx task-master set-status --id=<id> --status=done
```

**Ejemplo:**

```bash
npx task-master set-status --id=1 --status=done
```

---

## 📋 Comandos útiles

### Listar todas las tareas

```bash
npx task-master list
```

Muestra todas las tareas con su estado, prioridad, y dependencias.

### Mostrar detalles de una tarea

```bash
npx task-master show <id>
```

Muestra detalles completos de una tarea específica.

### Ver siguiente tarea

```bash
npx task-master next
```

Muestra la siguiente tarea disponible para trabajar.

### Crear tarea desde PRD

Si existe un PRD en `.taskmaster/docs/prd.md`:

```bash
npx task-master parse-prd .taskmaster/docs/prd.md
```

Esto crea tareas automáticamente desde el documento de requisitos.

**Nota:** Requiere API key en `.env`:
- `ANTHROPIC_API_KEY` (recomendado)
- `OPENAI_API_KEY` o `GOOGLE_API_KEY` (alternativas)

---

## 🚨 Estados de tarea

| Estado | Descripción | Cuándo usar |
|--------|-------------|-------------|
| `pending` | Tarea pendiente | Tarea creada, no iniciada |
| `in_progress` | En progreso | Trabajando activamente en la tarea |
| `done` | Completada | Todos los criterios cumplidos |
| `blocked` | Bloqueada | Esperando por dependencia externa |
| `deferred` | Aplazada | Decidida posponer temporalmente |
| `cancelled` | Cancelada | Ya no necesaria |

---

## 📊 Prioridades

| Prioridad | Descripción | Cuándo usar |
|-----------|-------------|-------------|
| `high` | Alta | Bloqueador crítico, urgente |
| `medium` | Media | Importante pero no urgente |
| `low` | Baja | Nice-to-have, puede esperar |

---

## 🔗 Dependencias

### Tareas con dependencias

Task Master AI soporta dependencias entre tareas. Al crear una tarea:

```bash
npx task-master add-task \
  --title="Implementar frontend de notificaciones" \
  --description="UI para mostrar notificaciones push" \
  --priority=medium \
  --depends-on=1  # Depende de tarea ID 1
```

### Verificar dependencias

```bash
npx task-master list
```

Muestra qué tareas bloquean a otras.

---

## 📝 Registrar bloqueos

Si una tarea está bloqueada:

```bash
npx task-master set-status --id=<id> --status=blocked
```

Y agregar notas sobre el bloqueo en el archivo de la tarea (`.taskmaster/tasks/<id>.md`).

---

## 🔄 Integración con workflow

Task Master AI se integra en el workflow en:

**Paso 5: Crear o actualizar tareas**

```bash
# Si es una tarea nueva
npx task-master add-task --title="..." --description="..." --priority=high

# Si la tarea ya existe
npx task-master set-status --id=<id> --status=in-progress
```

**Paso 11: Cerrar la tarea**

```bash
npx task-master set-status --id=<id> --status=done
```

---

## 🎯 Best practices

### Crear tareas

- **DO**: Crear tareas para trabajo significativo
- **DO**: Usar títulos descriptivos y cortos
- **DO**: Agregar descripciones detalladas
- **DON'T**: Crear tareas para cambios triviales

### Expandir tareas

- **DO**: Expandir tareas complejas en subtareas
- **DO**: Mantener subtareas enfocadas y manejables
- **DON'T**: Sobre-fragmentar tareas simples

### Cerrar tareas

- **DO**: Verificar todos los criterios antes de cerrar
- **DO**: Ejecutar validaciones completas
- **DON'T**: Cerrar tareas con errores pendientes

### Gestionar bloqueos

- **DO**: Informar al usuario de bloqueos rápidamente
- **DO**: Documentar el motivo del bloqueo
- **DO**: Sugerir alternativas cuando sea posible
- **DON'T**: Dejar tareas bloqueadas sin comunicación

---

## 🤖 AI Features

Task Master AI tiene features powered por AI que requieren API keys:

### parse-prd

Parsea un PRD y crea tareas automáticamente.

**Requiere:**
- `ANTHROPIC_API_KEY` (recomendado)
- `OPENAI_API_KEY` o `GOOGLE_API_KEY` (alternativas)

**Uso:**

```bash
npx task-master parse-prd .taskmaster/docs/prd.md
```

### expand

Expande una tarea en subtareas usando AI.

**Requiere:**
- `ANTHROPIC_API_KEY` (recomendado)
- `OPENAI_API_KEY` o `GOOGLE_API_KEY` (alternativas)

**Uso:**

```bash
npx task-master expand --id=<id>
```

### add-task con --prompt

Crea una tarea con descripción generada por AI.

**Requiere:**
- `ANTHROPIC_API_KEY` (recomendado)
- `OPENAI_API_KEY` o `GOOGLE_API_KEY` (alternativas)

**Uso:**

```bash
npx task-master add-task \
  --title="Implementar feature X" \
  --prompt="Explicar cómo implementar feature X con detalles técnicos"
```

### research mode

Al expandir tareas, puede usar Perplexity para research.

**Requiere:**
- `PERPLEXITY_API_KEY` (opcional)

**Nota:** Research mode es opcional, expand funciona sin él.

---

## 📊 Monitoreo de progreso

### Ver progreso general

```bash
npx task-master list
```

Muestra:
- Total de tareas
- Tareas completadas
- Tareas en progreso
- Tareas pendientes
- Tareas bloqueadas

### Métricas de progreso

- **Tasks Progress**: Porcentaje de tareas completadas
- **Subtasks Progress**: Porcentaje de subtareas completadas
- **Priority Breakdown**: Distribución por prioridad
- **Dependency Status**: Tareas bloqueadas por dependencias

---

## 🚨 Troubleshooting

### Error "API key not found"

**Causa:** Feature AI requiere API key no configurada

**Solución:**
Agregar al `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
# o
OPENAI_API_KEY=sk-...
# o
GOOGLE_API_KEY=...
```

### Tarea no aparece en list

**Causa:** Tarea creada pero no guardada correctamente

**Solución:**
```bash
# Verificar archivo tasks.json
cat .taskmaster/tasks/tasks.json

# Si está corrupto, recrear
npx task-master add-task --title="..." --description="..."
```

### Dependencias no resueltas

**Causa:** Tarea depende de tarea que no existe

**Solución:**
```bash
# Verificar dependencias
npx task-master list

# Corregir IDs de dependencia en tasks.json
# o recrear tarea con dependencias correctas
```

---

## 📚 Integración con otros archivos

- **workflow.md**: Define cuándo crear/cerrar tareas
- **instructions.md**: Define políticas de implementación
- **memory.md**: Define cómo registrar decisiones en tareas
- **verification.md**: Define criterios para cerrar tareas

---

## 🎯 Ejemplo completo

### Escenario: Implementar feature de notificaciones

```bash
# 1. Crear tarea principal
npx task-master add-task \
  --title="Implementar sistema de notificaciones push" \
  --description="Agregar soporte para notificaciones push en tiempo real usando WebSockets" \
  --priority=high

# 2. Expandir en subtareas
npx task-master expand --id=1

# 3. Seleccionar siguiente tarea
npx task-master next

# 4. Marcar en progreso
npx task-master set-status --id=2 --status=in-progress

# 5. Trabajar en subtarea (siguiendo workflow.md)
# ... implementación ...

# 6. Marcar subtarea como completada
npx task-master set-status --id=2 --status=done

# 7. Repetir para otras subtareas
# ...

# 8. Marcar tarea principal como completada
npx task-master set-status --id=1 --status=done
```

---

## 📝 Conventions

### Títulos de tarea

- **DO**: Cortos y descriptivos (5-10 palabras)
- **DO**: Usar lenguaje del dominio
- **DON'T**: Usar jerga técnica innecesaria

**Buenos ejemplos:**
- "Implementar sistema de notificaciones push"
- "Refactorizar DAL para soportar transactions"
- "Corregir bug de auth en login"

**Malos ejemplos:**
- "Fix stuff"
- "Do the thing"
- "Work on backend"

### Descripciones de tarea

- **DO**: Detalladas pero concisas
- **DO**: Incluir contexto de negocio
- **DO**: Especificar criterios de aceptación
- **DON'T**: Ser vagas o ambiguas

**Buen ejemplo:**
```
Agregar soporte para notificaciones push en tiempo real usando WebSockets.
Debe incluir:
- Conexión WebSocket en frontend
- Servicio de broadcast en backend
- Manejo de desconexiones
- Rate limiting para prevenir spam
- UI para mostrar notificaciones
```

**Mal ejemplo:**
```
Agregar notificaciones.
```

---

## 🔄 Mantenimiento

### Limpieza periódica

```bash
# Listar tareas completadas antiguas
npx task-master list

# Archivar tareas completadas (manual)
# Mover archivos .taskmaster/tasks/<id>.md a carpeta de archivo
# Eliminar de tasks.json
```

### Revisión de dependencias

```bash
# Verificar dependencias rotas
npx task-master list

# Corregir si es necesario
# Editar tasks.json manualmente
```

---

## 📚 Recursos adicionales

- **workflow.md**: Flujo de desarrollo completo
- **instructions.md**: Políticas del agente
- **memory.md**: Uso de memoria persistente
- **verification.md**: Criterios de verificación
