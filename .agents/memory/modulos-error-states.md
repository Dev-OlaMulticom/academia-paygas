---
name: ModulosPage Error State Handling
description: ModulosPage must distinguish network errors (502, timeout) from actual "module not found" to avoid misleading messages.
---

When 3+ browser sessions hit the API simultaneously (e.g., parallel e2e tests), transient 502 errors occur. If loadModulo() catches a network error, the catch block previously showed "Módulo não encontrado" (wrong) because modulo state was null.

**Why:** The catch block only set setLessons([]) but not setModulo(). Since modulo starts as null, the "Módulo não encontrado" UI showed even for pure network errors.

**How to apply:** Use a separate `loadError` state in ModulosPage. When catch runs, set `loadError` and show "Erro ao carregar módulo" with a retry button. Only show "Módulo não encontrado" when modulo is null AND loadError is null (meaning fetch succeeded but slug didn't match).
