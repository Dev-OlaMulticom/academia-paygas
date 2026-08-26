#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Academia PayGas - Deploy generico (VPS bare-metal)
# install (bun) -> build -> migrate -> restart -> healthcheck
# Requisitos: bun 1.4+, node 22+, acceso a la(s) Postgres de .env
# ═══════════════════════════════════════════════════════════
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DEPLOY_DIR"

DOMAIN="${DOMAIN:-academia.paygas.com.br}"
PORT="${PORT:-3001}"
ERRORS=0

log_ok()   { echo "  [OK] $1"; }
log_warn() { echo "  [WARN] $1"; }
log_fail() { echo "  [FAIL] $1"; ERRORS=$((ERRORS + 1)); }

echo "═══════════════════════════════════════════════════════"
echo "  Academia PayGas - Deploy"
echo "  Directorio: $DEPLOY_DIR  Fecha: $(date)"
echo "═══════════════════════════════════════════════════════"

# ─── 1. Pre-flight ────────────────────────────────────────
echo "=== [1/6] Verificando herramientas ==="
command -v node >/dev/null || { echo "Node.js no encontrado"; exit 1; }
log_ok "Node $(node -v)"
command -v bun  >/dev/null || { echo "Bun no encontrado (https://bun.sh): curl -fsSL https://bun.sh/install | bash"; exit 1; }
log_ok "Bun $(bun --version)"
[ -f .env ] && log_ok ".env presente" || { log_fail ".env no encontrado"; exit 1; }

TOTAL_MB=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$TOTAL_MB" -gt 0 ] && [ "$TOTAL_MB" -lt 1500 ]; then
  log_warn "Host con ${TOTAL_MB}MB RAM: compilar aquí puede agotar la memoria."
  log_warn "Recomendado: construir la imagen en CI y hacer 'docker compose pull', o buildear en otra máquina."
fi

set -a; source .env; set +a
export NODE_ENV="${NODE_ENV:-production}"

# ─── 2. Backup del build actual ───────────────────────────
echo "=== [2/6] Respaldando build actual ==="
BACKUP_DIR="$DEPLOY_DIR/.backup-build"
if [ -d dist ]; then
  rm -rf "$BACKUP_DIR"; mkdir -p "$BACKUP_DIR"
  cp -r dist/index.html "$BACKUP_DIR/" 2>/dev/null || true
  cp -r dist/assets "$BACKUP_DIR/" 2>/dev/null || true
  cp -r dist/server "$BACKUP_DIR/" 2>/dev/null || true
  log_ok "Build respaldado en .backup-build/"
else
  log_warn "No hay build previo"
fi

# ─── 3. Dependencias ──────────────────────────────────────
echo "=== [3/6] Instalando dependencias (bun) ==="
rm -rf node_modules/.vite .vite 2>/dev/null || true
if bun install --frozen-lockfile; then
  log_ok "Dependencias instaladas"
else
  log_fail "bun install fallo"
  exit 1
fi

# ─── 4. Build ─────────────────────────────────────────────
echo "=== [4/6] Compilando ==="
bun run build:server || { log_fail "build:server fallo"; exit 1; }
log_ok "Bundle servidor: dist/server/index.js"
bun run build:client || { log_fail "build:client fallo"; exit 1; }
# Sync del cliente al root de dist/ (layouts donde nginx sirve estaticos desde dist/)
mkdir -p dist
cp -r apps/web/dist/client/. dist/
log_ok "Cliente copiado a dist/"

# ─── 5. Base de datos ─────────────────────────────────────
echo "=== [5/6] Prisma generate + migrate ==="
npx prisma generate --schema=packages/db/prisma/schema.prisma || log_fail "prisma generate (PG) fallo"

REACHABLE_DB_URL=""
for url in "$PG_URL_1" "$PG_URL_2" "$PG_URL_3" "$DATABASE_URL"; do
  [ -z "$url" ] && continue
  [ -n "$REACHABLE_DB_URL" ] && continue
  DB_HOST=$(echo "$url" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$url" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    if timeout 5 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
      REACHABLE_DB_URL="$url"
      log_ok "DB reachable: $DB_HOST:$DB_PORT"
    else
      log_warn "DB no reachable (skipped): $DB_HOST:$DB_PORT"
    fi
  fi
done
if [ -n "$REACHABLE_DB_URL" ]; then
  export DATABASE_URL="$REACHABLE_DB_URL"
fi

if npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma; then
  log_ok "Migraciones aplicadas"
else
  log_warn "migrate deploy fallo (revisar estado de migraciones)"
fi

# ─── 6. Restart + healthcheck ─────────────────────────────
echo "=== [6/6] Reiniciando servicio ==="
./start.sh

sleep 3
if curl -sf "http://localhost:${PORT}/health" >/dev/null; then
  log_ok "Healthcheck local OK (http://localhost:${PORT}/health)"
else
  log_fail "Healthcheck local fallo — revisar logs/app.log"
fi
if command -v curl >/dev/null && curl -sf "https://${DOMAIN}/" >/dev/null 2>&1; then
  log_ok "https://${DOMAIN}/ responde"
else
  log_warn "No se pudo verificar https://${DOMAIN}/ (puede ser DNS/local)"
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "Deploy completado sin errores."
else
  echo "Deploy completado con $ERRORS problema(s). Revisar mensajes [FAIL]."
  exit 1
fi
