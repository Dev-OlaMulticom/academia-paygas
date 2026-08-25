# syntax=docker/dockerfile:1
ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@9 --activate
# Build toolchain for native modules (better-sqlite3) that lack musl prebuilds
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Fast lockfile sync check (~0.5s) before the expensive install (~45s).
# Fails early with an actionable message if package.json was edited without
# regenerating pnpm-lock.yaml (the cause of ERR_PNPM_OUTDATED_LOCKFILE).
RUN pnpm install --frozen-lockfile --lockfile-only || ( \
      echo "==========================================================" && \
      echo "ERROR: pnpm-lock.yaml is out of sync with package.json." && \
      echo "Fix locally: pnpm install --lockfile-only" && \
      echo "Then commit the updated pnpm-lock.yaml." && \
      echo "==========================================================" && \
      exit 1 \
    )
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile --prod=false

FROM deps AS builder
COPY . .
RUN --mount=type=cache,target=/root/.pnpm-store pnpm prisma generate --schema=packages/db/prisma/schema.prisma && pnpm prisma generate --schema=packages/db/prisma/schema.mysql.prisma
RUN pnpm build:server
RUN pnpm build:client

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS="--max-old-space-size=192"
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/web/dist/client ./dist/client
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/prisma/generated/mysql ./prisma/generated/mysql
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
# Install build toolchain, run prod install + prune + prisma generate, then remove toolchain to keep image small.
RUN apk add --no-cache --virtual .build-deps python3 make g++ linux-headers && \
    pnpm install --frozen-lockfile --prod && (pnpm prune --prod || true) && \
    pnpm prisma generate --schema=packages/db/prisma/schema.prisma && \
    pnpm prisma generate --schema=packages/db/prisma/schema.mysql.prisma && \
    node -e "require('@prisma/client')" && \
    apk del .build-deps
RUN chown -R app:app /app
USER app
EXPOSE 3001
HEALTHCHECK --interval=60s --timeout=5s --start-period=15s --retries=3 CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node","dist/server/index.js"]
