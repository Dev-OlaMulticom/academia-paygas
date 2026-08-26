# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
ARG BUN_VERSION=1.4-alpine

FROM oven/bun:${BUN_VERSION} AS bun

FROM node:${NODE_VERSION}-alpine AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
# Build toolchain for native modules that lack musl prebuilds
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
# Fast lockfile sync check before the expensive install.
# Fails early with an actionable message if package.json was edited without
# regenerating bun.lock.
RUN bun install --frozen-lockfile --lockfile-only || ( \
      echo "==========================================================" && \
      echo "ERROR: bun.lock is out of sync with package.json." && \
      echo "Fix locally: bun install --lockfile-only" && \
      echo "Then commit the updated bun.lock." && \
      echo "==========================================================" && \
      exit 1 \
    )
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma && npx prisma generate --schema=packages/db/prisma/schema.mysql.prisma
RUN bun run build:server
RUN bun run build:client

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS="--max-old-space-size=192"
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

# Prod-only install from the lockfile, then regenerate Prisma clients
# (prisma CLI ships in dependencies).
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/web/dist/client ./dist/client
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/prisma/generated/mysql ./prisma/generated/mysql
COPY --from=builder /app/prisma.config.ts ./
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma && \
    npx prisma generate --schema=packages/db/prisma/schema.mysql.prisma
RUN chown -R app:app /app
USER app
EXPOSE 3001
HEALTHCHECK --interval=60s --timeout=5s --start-period=15s --retries=3 CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node","dist/server/index.js"]
