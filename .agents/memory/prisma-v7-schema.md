---
name: Prisma v7 schema and adapter rules
description: Prisma v7 changed how DB connection URLs are handled — datasource block must not have `url`, use adapter instead
---

## Rule
In Prisma v7, the `datasource` block in `schema.prisma` must NOT contain a `url` or `directUrl` property. Adding it causes a P1012 validation error:
> "The datasource property `url` is no longer supported in schema files."

## How connection works
- `prisma.config.ts` — export `defineConfig({ migrate: { adapter: async (env) => new PrismaPg(...) } })`
- `src/lib/prisma.ts` — `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`
- CLI commands: `prisma generate --config prisma.config.ts`, `prisma db push --config prisma.config.ts`

**Why:** Prisma v7 moved connection management out of the schema file to support multiple adapters and deployment targets cleanly.

**How to apply:** Any time Prisma schema changes are needed, use the `--config prisma.config.ts` flag. Never add `url = env("DATABASE_URL")` to the datasource block.

## Initial schema creation
If `db push` fails (e.g., config issues), create tables via raw SQL using `node --input-type=module` with the `pg` package directly.
