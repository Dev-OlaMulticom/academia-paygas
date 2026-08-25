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
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --frozen-lockfile --prod=false

FROM deps AS builder
COPY . .
RUN --mount=type=cache,target=/root/.pnpm-store pnpm prisma generate --schema=packages/db/prisma/schema.prisma && pnpm prisma generate --schema=packages/db/prisma/schema.mysql.prisma
RUN pnpm build:server
RUN pnpm build:client

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
RUN addgroup -S app && adduser -S app -G app
# Build toolchain for native modules (better-sqlite3) installed in the --prod step
RUN apk add --no-cache python3 make g++ linux-headers
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/prisma/generated/mysql ./prisma/generated/mysql
COPY --from=builder /app/package.json ./
RUN pnpm install --frozen-lockfile --prod && (pnpm prune --prod || true)
RUN pnpm prisma generate --schema=packages/db/prisma/schema.prisma && pnpm prisma generate --schema=packages/db/prisma/schema.mysql.prisma
RUN chown -R app:app /app
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node","dist/server/index.js"]
