# Plan de migración Prisma → Drizzle

> **Status:** plan de referencia. No es una recomendación inmediata de ejecución.  
> **Objetivo:** reemplazar completamente Prisma por Drizzle ORM en el backend (`apps/api`) manteniendo las mismas capacidades: multi-PostgreSQL failover, MySQL dual-write, health checks, sync y migrations.  
> **Política central:** cada fase se prueba y se comprueba antes de pasar a la siguiente. **No se avanza con gate rojo.**

---

## Contexto

Hoy el backend usa:

- `PrismaClient` para PostgreSQL vía `@prisma/adapter-pg`.
- Cliente MySQL generado en `packages/db/prisma/generated/mysql` vía `@prisma/adapter-mariadb`.
- DAL (`lib/db.ts`), registro de bases (`config/databases.ts`), cache de delegates (`lib/db-models.ts`) y workers (`db-sync`, `db-realtime`, `db-migrations`) fuertemente acoplados a Prisma.
- Esquemas en `packages/db/prisma/schema.prisma` y `packages/db/prisma/schema.mysql.prisma`.

La migración a Drizzle debe conservar:

- Failover de lectura entre múltiples PostgreSQL.
- Escritura primaria + fire-and-forget a backups PG y MySQL.
- Health checks con latencia y reconexión.
- `db-sync` y `db-migrations` para replicas.
- `LISTEN/NOTIFY` de `db-realtime`.
- Encriptación AES-256-GCM y auth JWT sin cambios de contrato.

---

## Política de gates y pruebas

### Regla de oro

**Cada fase tiene un gate. Si el gate no pasa, no se avanza.** El gate incluye código, tests y validación en un entorno no productivo.

### Entorno de pruebas requerido

- Base de datos PostgreSQL de staging con datos representativos.
- Opcionalmente un segundo PG de backup para probar failover.
- Container local o de staging con `MICRO_MODE=0` y `MICRO_MODE=1`.
- Northflank staging o local con Dockerfile.

### Checklist general antes de cada gate

- [ ] `npx tsc --project tsconfig.server.json --noEmit` pasa sin errores.
- [ ] `pnpm build` genera `dist/server/index.js` y `dist/client` sin fallos.
- [ ] El contenedor Docker arranca y responde `GET /health`.
- [ ] No hay errores de runtime en los logs del contenedor (30 min de uptime).
- [ ] Se puede hacer rollback a la versión anterior en <10 minutos.

### Rollback base

Si cualquier fase falla, se revierte el PR/MR, se restaura la imagen anterior y se vuelve a `prisma`. No se intenta arreglar "en caliente" en producción.

---

## Riesgo global

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| Regresión en DAL | Alto | Si el nuevo DAL no mantiene el contrato, se rompen login, permisos, certificados. |
| Diferencias de tipos | Alto | Prisma devuelve `Date` para `DateTime`; Drizzle puede devolver `string` u otro formato según configuración. |
| JSONB y enums | Medio | Drizzle soporta `jsonb` y `pgEnum`, pero requiere conversión de esquemas. |
| Generación de migraciones | Medio | No hay traducción automática 1:1 de `prisma migrate` a `drizzle-kit`. |
| Workers | Medio | `db-sync` y `db-realtime` usan queries pesadas y `LISTEN/NOTIFY`; deben reescribirse en `pg`/Drizzle. |
| MySQL | Medio | Se mantiene con `drizzle-orm/mysql2`, pero el dual-write se rehace. |
| Build/Docker | Medio | Se eliminan `prisma generate`, `node_modules/.prisma` y sus runtime engines. |

**Estimación total aproximada:** 4-6 semanas de trabajo enfocado, congelando features nuevas.

---

## Estrategia: Strangler Fig para el ORM

No se reescribe todo de una vez. Se crea una **capa de DAL paralela en Drizzle** (`lib/drizzle-db.ts`, `lib/drizzle-models.ts`) y se migra ruta por ruta. Prisma se mantiene mientras haya rutas que aún la usen. Cuando el 100% de los handlers usen Drizzle, se elimina Prisma.

---

## Fase 0 — Preparación

### Objetivo
Tener Drizzle instalado, un esquema PG traducido y una conexión funcional de prueba sin tocar producción.

### Tareas

1. Instalar dependencias:
   ```bash
   pnpm add drizzle-orm pg
   pnpm add -D drizzle-kit @types/pg
   ```
2. Crear directorio `packages/db/drizzle/`.
3. Traducir `packages/db/prisma/schema.prisma` a esquemas Drizzle:
   - `packages/db/drizzle/pg/schema.ts` — tablas de PostgreSQL.
   - `packages/db/drizzle/pg/relations.ts` — relaciones (opcional).
4. Crear `drizzle.config.ts` apuntando a `DATABASE_URL` para `drizzle-kit`.
5. Correr `npx drizzle-kit generate` y verificar que las migraciones son equivalentes a las de Prisma.
6. Crear un script de prueba `packages/db/drizzle/test.ts` que conecte, lea un `User` y cierre. Validar tipos.

### Pruebas obligatorias

- [ ] Comparar 1 a 1 las tablas: cada `model` de Prisma tiene una tabla en `schema.ts`.
- [ ] Comparar tipos: `DateTime` → `timestamp`, `Json` → `jsonb`, `enum` → `pgEnum`.
- [ ] Script `test.ts` lee y escribe una fila sin errores de tipo.
- [ ] `npx tsc --noEmit` pasa con los nuevos esquemas.

### Criterios de gate Fase 0

- [ ] `drizzle-kit generate` produce migraciones equivalentes a las de Prisma.
- [ ] Script de prueba lee/escribe `User` en PostgreSQL con tipos correctos.
- [ ] Build del servidor no se rompe con las nuevas dependencias.

### Si falla

- Revisar mapeo de tipos y relaciones. No avanzar a Fase 1.

---

## Fase 1 — DAL Drizzle + registry PG

### Objetivo
Replicar la abstracción de `lib/db.ts` y `lib/db-models.ts` pero sobre Drizzle.

### Tareas

1. Crear `apps/api/src/server/lib/drizzle-db.ts` con el mismo contrato público que `db`:
   - `create(model, data)`
   - `createMany(model, data[])`
   - `findUnique(model, where)`
   - `findFirst(model, where, opts)`
   - `findMany(model, where, opts)`
   - `update(model, where, data)`
   - `updateMany(model, where, data)`
   - `delete(model, where)`
   - `deleteMany(model, where)`
   - `queryRaw(sql, params)`
   - `transaction(fn)`
2. Crear `apps/api/src/server/lib/drizzle-models.ts` que devuelva `{ primary, backups, mysql }` de delegates de Drizzle.
3. Adaptar `config/databases.ts` para que cada `DatabaseEntry` tenga un `pg.Pool` (driver nativo) además del `PrismaClient` existente.
4. Implementar failover de lectura igual que hoy: reintentar en backups.
5. Implementar escritura primaria + fire-and-forget a backups PG.

### Pruebas obligatorias

- [ ] Test unitario: `drizzle-db.create('user', ...)` devuelve el mismo objeto que Prisma.
- [ ] Test unitario: `drizzle-db.findMany('curso', { where: { ativo: true } })` devuelve el mismo resultado y tipos.
- [ ] Test de failover: caer `PG_1` y verificar que la lectura pasa a `PG_2`.
- [ ] Test de escritura: crear un registro, verificar que existe en primaria y que el backup intenta replicar sin bloquear.
- [ ] Test de JSONB: crear un `RoleConfig` con `permissions` y leerlo; comparar estructura con Prisma.

### Criterios de gate Fase 1

- [ ] `drizzle-db.ts` pasa todos los tests de CRUD contra una sola base.
- [ ] Failover de lectura funciona con `PG_1` caído.
- [ ] Escritura a primaria + backups no bloquea y no genera diferencias de tipo.
- [ ] Container arranca y `GET /health` responde usando Drizzle para la query de salud.

### Si falla

- No migrar ninguna ruta. Refinar `drizzle-db.ts` y `drizzle-models.ts`.

---

## Fase 2 — Middleware, auth y encriptación

### Objetivo
Asegurar que auth y encriptación funcionan con el nuevo DAL sin depender de Prisma.

### Tareas

1. Revisar `middleware/auth.ts` y `middleware/encryption.ts`. No usan Prisma directamente, pero dependen de `req.body` y `res.json`.
2. Asegurar que, si se migra a Fastify o se mantiene Express, el formato de respuesta encriptada siga igual.
3. Verificar que `getServerEncryptionKey` (`/api/config`) siga resolviendo.
4. Si aún no se migra a Fastify, dejar `auth.ts` y `encryption.ts` como middleware de Express. Si se migra, adaptar a Fastify `preHandler` / `onSend`.

### Pruebas obligatorias

- [ ] Login con email/password cifrado devuelve el mismo JWT que antes.
- [ ] Endpoint con `x-encrypted: true` recibe body cifrado, lo descifra, procesa y devuelve respuesta cifrada.
- [ ] Token inválido devuelve `401` igual.
- [ ] Usuario sin rol correcto devuelve `403` igual.

### Criterios de gate Fase 2

- [ ] Login, endpoints con body cifrado y rate-limit funcionan con Drizzle DAL.
- [ ] No hay diferencias en el contrato de respuesta.
- [ ] `npx tsc --project tsconfig.server.json --noEmit` pasa.

### Si falla

- Revisar `encryption.ts` (posiblemente la serialización de body cambia con Drizzle).

---

## Fase 3 — Migración ruta por ruta

### Objetivo
Cada ruta de `apps/api/src/server/routes/*.ts` pasa de `import { db } from '../lib/db'` a `import { db } from '../lib/drizzle-db'`.

### Orden propuesto (de menor a mayor riesgo)

1. `public.ts`, `docs.ts`, `analytics.ts` (lectura, pocos handlers).
2. `gamification.ts`, `xpconfig.ts`, `conquistas.ts`.
3. `modules.ts`, `forum.ts`, `notifications.ts`.
4. `certificates.ts`, `progresso.ts`, `dashboard.ts`.
5. `auth.ts`, `usuarios.ts`, `sso.ts`, `cms.ts` (core de auth y usuarios).
6. `adminDashboard.ts`, `role-permissions.ts`, `logs.ts`, `import-export.ts`, `paygas-access.ts`.

### Cuidados por ruta

- Revisar conversiones de `Number(req.params.id)` y `Number(req.query.page)`.
- Validar que `findMany` con `where: { ativo: true }` devuelve el mismo shape.
- Reescribir queries con `Prisma.sql` y `$queryRaw` a `drizzle-orm/sql` o `pg.raw`.
- Revisar `JSONB` (`RoleConfig.permissions`) para usar `jsonb` de Drizzle y serializar antes de insertar.

### Pruebas obligatorias por ruta

- [ ] Test funcional end-to-end de cada ruta migrada.
- [ ] Comparar payloads de respuesta contra Prisma para 5 llamadas representativas.
- [ ] Verificar status codes y errores (400, 401, 403, 404, 500).

### Criterios de gate Fase 3

- [ ] 100% de las 21 rutas migradas.
- [ ] Suite de pruebas funcional pasa (login, CRUD de cursos, quizzes, certificados, reportes).
- [ ] Container en staging arranca y responde sin errores de `pool timeout` ni `MODULE_NOT_FOUND`.
- [ ] No queda ningún `import { db } from '../lib/db'` en `routes/`.

### Si falla

- Revertir el PR de la ruta problemática y corregir. Continuar con las demás solo si el fallo es aislado.

---

## Fase 4 — Workers y sync

### Objetivo
Reescribir `db-sync.ts`, `db-realtime.ts`, `db-migrations.ts` sin `PrismaClient`.

### Tareas

1. **db-sync.ts**
   - Reemplazar `prisma.$queryRaw` por `pg` `query` o Drizzle raw SQL.
   - Mantener lógica de diff (checksum `md5(t::text)`).
   - Serializar JSONB antes de upsert.
   - `INCREMENTAL_INTERVAL`, `FULL_SYNC_INTERVAL`, `MICRO_MODE` se mantienen.
2. **db-migrations.ts**
   - Si hoy sincroniza schema entre replicas, rehacer con `drizzle-kit` y `pg` introspection.
   - O, más simple, usar `drizzle-kit push` solo contra la primaria y replicar DDL por `pg`.
3. **db-realtime.ts**
   - Reemplazar `PgClient` de Prisma por un `pg.Client` nativo para `LISTEN/NOTIFY`.
   - Reescribir `syncRow` para usar Drizzle inserts/updates con JSONB serializado.
4. **db-health.ts**
   - Usar `pg.Pool` del registro para latencia y estado.

### Pruebas obligatorias

- [ ] `db-health` marca bases como `connected` / `disconnected` correctamente.
- [ ] `db-sync` full completa sin `22P02` (JSONB) ni `pool timeout`.
- [ ] `db-sync` incremental detecta y replica cambios.
- [ ] `db-realtime` escucha y propaga `INSERT/UPDATE/DELETE` en <1s.
- [ ] `MICRO_MODE=1` desactiva sync y realtime correctamente.

### Criterios de gate Fase 4

- [ ] Sync incremental + full pasan en ambiente de staging con 2 bases.
- [ ] `LISTEN/NOTIFY` propaga cambios en <1s.
- [ ] `MICRO_MODE` sigue desactivando realtime y sync.

### Si falla

- No eliminar Prisma. Revisar queries raw y serialización JSONB.

---

## Fase 5 — MySQL dual-write

### Objetivo
Reescribir `prisma-mysql.ts` con `drizzle-orm/mysql2`.

### Tareas

1. Instalar `drizzle-orm/mysql2 mysql2`.
2. Crear `packages/db/drizzle/mysql/schema.ts` a partir de `packages/db/prisma/schema.mysql.prisma`.
3. Crear `apps/api/src/server/lib/drizzle-mysql.ts` que devuelva un cliente Drizzle o `null` si no hay `MYSQL_URL`.
4. Adaptar `drizzle-models.ts` para que `mysql` sea el nuevo delegate MySQL.
5. `MICRO_MODE` ya desactiva MySQL; ese guardia se mantiene.

### Pruebas obligatorias

- [ ] `MYSQL_URL` ausente → dual-write es nulo, sin logs de `pool timeout`.
- [ ] `MYSQL_URL` presente → escritura se replica en MySQL y falla sin bloquear.
- [ ] Comparar 5 modelos críticos (`user`, `curso`, `aula`, `quiz`, `progresso`) entre PG y MySQL después de escritura.

### Criterios de gate Fase 5

- [ ] MySQL dual-write funciona en staging con datos consistentes.
- [ ] `MICRO_MODE=1` no intenta conectar MySQL.

### Si falla

- Dejar MySQL desactivado en producción (`MICRO_MODE=1` o sin `MYSQL_URL`) y documentar la limitación.

---

## Fase 6 — Limpieza y build

### Objetivo
Eliminar todo rastro de Prisma del repositorio, salvo `prisma/schema` como referencia.

### Tareas

1. Eliminar `packages/db/prisma/` del build de producción.
2. Quitar `@prisma/client`, `@prisma/adapter-pg`, `@prisma/adapter-mariadb`, `prisma` de `dependencies`.
3. Actualizar `package.json` scripts: reemplazar `npx prisma generate` por `npx drizzle-kit generate`.
4. Actualizar `Dockerfile`: eliminar `prisma generate` y copiar solo el esquema/migraciones de Drizzle.
5. Actualizar `AGENTS.md` y `.ai/AGENTS.md` con los nuevos comandos.
6. Correr `pnpm build`, `pnpm test`, `npx tsc --project tsconfig.server.json --noEmit`.

### Pruebas obligatorias

- [ ] `pnpm build` completo sin `prisma`.
- [ ] `docker build . -t academia-paygas:test` y `docker run` responden `/health`.
- [ ] Test suite `pnpm test` pasa.
- [ ] Login + crear curso + responder quiz + generar certificado en staging.
- [ ] 30 min de uptime sin errores en logs.

### Criterios de gate Fase 6

- [ ] Build limpio sin `prisma`.
- [ ] Tests pasan.
- [ ] Imagen Docker se construye y arranca.
- [ ] No queda `import` de Prisma en `apps/api/src/server`.

### Si falla

- No deployar a producción. Volver a la imagen anterior. Rehacer la fase que rompió.

---

## Entrega continua y control de riesgo

- **Nunca borrar Prisma hasta que el 100% de las rutas y workers estén en Drizzle.**
- **Usar feature flags o imports condicionales** mientras haya rutas duales.
- **Mantener `MICRO_MODE`** durante toda la migración para evitar workers en el plan gratis.
- **Test de regresión mínimo:** login, crear usuario, crear curso, responder quiz, generar certificado, sync completo.

---

## Resumen de estimación

| Fase | Esfuerzo estimado | Riesgo | Gate principal |
|------|-------------------|--------|----------------|
| Fase 0 | 1 semana | Medio | Esquema traducido y conexión funcional |
| Fase 1 | 1-2 semanas | Alto | DAL con failover y CRUD probados |
| Fase 2 | 1 semana | Medio | Login + encriptación con Drizzle |
| Fase 3 | 2-3 semanas | Alto | 100% de rutas migradas y testeadas |
| Fase 4 | 1-2 semanas | Alto | Workers sync/realtime funcionando |
| Fase 5 | 1 semana | Medio | MySQL dual-write consistente |
| Fase 6 | 1 semana | Medio | Build limpio, Docker y tests OK |
| **Total** | **8-12 semanas** | **Muy alto** | — |

---

## Recomendación del autor del plan

Migrar a Drizzle es técnicamente correcto y da un stack más ligero, pero **no es la primera palanca para el plan `nf-compute-10`**. Antes de ejecutar este plan, conviene:

1. Estabilizar y medir el consumo con `MICRO_MODE` ya activado.
2. Verificar que el frontend lazy-loading redujo transfer.
3. Si aún hay presión, optimizar `pbkdf2Sync` o el pool de conexiones.

Ejecutar este plan tiene sentido solo si el proyecto decide salir de Prisma por una razón estratégica (costo, vendor lock-in, performance a largo plazo), no como quick win de recursos.
