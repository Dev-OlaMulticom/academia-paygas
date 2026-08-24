# Devin CLI Configuration — Academia PayGas

Esta carpeta contiene la configuración optimizada de Devin CLI para maximizar la productividad del agente **SWE-1.6** en el proyecto Academia PayGas.

## 📁 Estructura de archivos

```
.devin/
├── README.md              # Este archivo - explicación general
├── instructions.md       # Políticas y reglas del agente
├── workflow.md           # Flujo de desarrollo estándar
├── memory.md             # Uso de memoria persistente (codebase-memory-mcp)
├── tasks.md              # Flujo de planificación y gestión de tareas
├── config.json           # Configuración de Devin CLI
├── project-context.md    # Contexto específico del proyecto
├── verification.md       # Guía de verificación y testing
├── patterns.md           # Patrones reutilizables del proyecto
└── skills/               # Skills específicos del proyecto (si aplica)
```

## 🎯 Objetivos de la configuración

1. **Maximizar productividad de SWE-1.6**: Configuración optimizada para el modelo SWE-1.6 Slow
2. **Integración con codebase-memory-mcp**: Uso sistemático de memoria del proyecto
3. **Integración con Task Master AI**: Gestión automática de tareas
4. **Evitar código duplicado**: Reutilización de componentes y patrones existentes
5. **Respetar arquitectura**: Mantener consistencia con el diseño existente
6. **Verificación continua**: Tests, lint, typecheck en cada cambio
7. **Documentación viva**: Actualizar memoria del proyecto continuamente

## 🚀 Uso rápido

### Para desarrolladores

La configuración se carga automáticamente cuando Devin CLI detecta la carpeta `.devin/` en la raíz del proyecto.

### Para el agente

El agente debe seguir el flujo definido en `workflow.md` para cada solicitud:

1. Comprender el objetivo
2. Consultar la memoria
3. Buscar código relacionado
4. Analizar impacto
5. Crear/actualizar tareas
6. Elaborar un plan
7. Implementar cambios pequeños
8. Ejecutar validaciones
9. Actualizar documentación
10. Actualizar la memoria

## 🔧 Configuración personalizada

### Variables de entorno requeridas

Verificar que el archivo `.env` exista con las variables necesarias (ver `AGENTS.md`):

```bash
# Base de datos
PG_URL_1="..."
PG_URL_2="..." (opcional)
DATABASE_URL="..."
MYSQL_URL="..." (opcional)

# APIs para Task Master AI (opcional)
ANTHROPIC_API_KEY="..." (recomendado)
PERPLEXITY_API_KEY="..." (opcional)
```

### Herramientas CLI requeridas

Antes de trabajar, verificar que estas herramientas estén instaladas:

```bash
pnpm --version        # Gestor de paquetes
npx tsc --version     # TypeScript
npx prisma --version  # ORM de base de datos
rg --version          # ripgrep (búsqueda de texto)
fd --version          # fd (búsqueda de archivos)
```

## 📚 Documentación del proyecto

- **AGENTS.md**: Documentación principal del proyecto (comandos, arquitectura, gotchas)
- **biome.json**: Configuración de linter/formatter
- **tsconfig.json**: Configuración TypeScript frontend
- **tsconfig.server.json**: Configuración TypeScript backend
- **packages/db/prisma/schema.prisma**: Esquema de base de datos PostgreSQL
- **packages/db/prisma/schema.mysql.prisma**: Esquema de base de datos MySQL (backup)

## 🔄 Integraciones

### codebase-memory-mcp

Siempre activo. Indexa el código y permite consultas sobre arquitectura, dependencias, y patrones.

**Proyecto MCP**: `home-soporte24hwww-Documentos-Repositorios-academia-paygas`

### Task Master AI

Gestión de tareas y planificación. Las tareas viven en `.taskmaster/tasks/tasks.json`.

## 🛡️ Políticas de seguridad

- Nunca exponer secrets o tokens en el código
- Nunca modificar políticas de seguridad
- Nunca desactivar middleware de autenticación
- Validar todas las entradas de usuario
- Usar consultas parametrizadas (Prisma) siempre

## 📝 Conventions del proyecto

- **Commit format**: `tipo: descripcion` (feat, fix, security, docs, chore, deploy)
- **Language**: UI strings en portugués (pt-BR), identificadores en portugués
- **No test framework**: Verificación manual via API health check
- **Deploy target**: cPanel con nginx reverse proxy

Ver `AGENTS.md` para más detalles.

## 🆘 Soporte

Para problemas con la configuración de Devin CLI:

```bash
devin --help
```

Para documentación detallada de Devin CLI, invocar el skill `devin-for-terminal`.
