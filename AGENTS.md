# AGENTS.md — Academia PayGas

> **Toda la documentación para agentes vive en `.ai/`.**

## Documentación completa

- **`.ai/AGENTS.md`** — Guía completa para agentes IA y desarrolladores
- **`.ai/README.md`** — Documentación principal del proyecto
- **`.ai/architecture.md`** — Arquitectura del sistema
- **`.ai/coding-rules.md`** — Reglas de codificación
- **`.ai/workflow.md`** — Flujo de desarrollo
- **`.ai/memory.md`** — Uso de codebase-memory-mcp
- **`.ai/testing.md`** — Verificación y tests
- **`.ai/taskmaster.md`** — Gestión de tareas

## Responsive rules (Mobile < 800px)

Reglas documentadas para evitar breakage en pantallas pequeñas:

| Selector | Regla mobile (< 800px) | Archivo |
|---|---|---|
| `.lesson-item-info b` | `white-space: normal; word-break: break-word` | `src/index.css` |
| `.page-subtitle` | `white-space: normal; word-break: break-word` | `src/index.css` |
| `.lesson-sidebar-header h3` | truncado a 2 líneas con `-webkit-line-clamp: 2` | `src/index.css` |
| `.media-modal-overlay` | centrado vertical (`align-items: center; padding: 12px`) | `src/index.css` |
| `.media-modal` | `border-radius: 12px; max-height: 85vh` (no bottom-sheet) | `src/index.css` |

**Regla general:** Si un elemento usa `white-space: nowrap`, se debe agregar un override `@media (max-width: 800px) { white-space: normal; word-break: break-word; }` para pantallas pequeñas.

## YouTube Embed (Modal de video)

El embed de YouTube en el media modal (`ModulosPage.tsx`) extrae solo el video ID con regex e ignora parámetros de playlist (`list`, `index`, etc.) que causaban URLs malformadas. Los parámetros enviados al embed son: `playsinline`, `rel=0`, `modestbranding=1`, `iv_load_policy=3`.

```ts
const ytMatch = mediaModal.url.match(
  /(?:youtube\.com\/(?:watch\?.*?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
);
const videoId = ytMatch?.[1];
// Construye: https://www.youtube.com/embed/{videoId}?playsinline=1&rel=0&...
```

## Commits recientes

- `56bef8f` fix: page-subtitle permite wrap en pantallas <800px
- `43e14a6` fix: extraer solo video ID para embed YouTube, ignorar params de playlist
- `c2b13bc` fix: responsive lesson-sidebar y media modal centrado en mobile
