#!/bin/bash
set -e

DEPLOY_DIR="/home/olamulticomcom/academia-paygas"
DEPLOY_DIR_LEGACY="/home/olamulticomcom/public_html/academia-paygas"
cd "$DEPLOY_DIR"

echo "=== Cargando variables de entorno ==="
set -a
source .env
set +a

echo "=== Matar procesos Node viejos ==="
# Kill by PID file
PID_FILE="$DEPLOY_DIR/logs/app.pid"
if [ -f "$PID_FILE" ]; then
    kill $(cat "$PID_FILE") 2>/dev/null || true
    rm -f "$PID_FILE"
fi

# Kill ALL node processes running this app (any path)
pkill -9 -f "node.*dist/server/index.js" 2>/dev/null || true
sleep 1

# Kill legacy process in public_html if exists
if [ -d "$DEPLOY_DIR_LEGACY" ]; then
    pkill -9 -f "node.*$DEPLOY_DIR_LEGACY.*dist/server" 2>/dev/null || true
fi

echo "=== Limpiando cache y build anterior ==="
rm -rf dist/server
rm -rf dist/assets
rm -f dist/index.html
rm -rf node_modules/.vite
rm -rf .vite

echo "=== Instalando dependencias ==="
pnpm install --no-frozen-lockfile

echo "=== Generando Prisma ==="
npx prisma generate

echo "=== Migrando base de datos ==="
npx prisma migrate deploy 2>/dev/null || true

echo "=== Compilando frontend ==="
npx vite build

echo "=== Compilando servidor ==="
npx tsc --project tsconfig.server.json

echo "=== Iniciando Node.js ==="
mkdir -p logs
nohup node dist/server/index.js > logs/app.log 2>&1 &
echo $! > logs/app.pid

echo "=== Deploy completado (PID: $(cat logs/app.pid)) ==="

echo "=== Limpiando cache Apache ==="
touch dist/index.html 2>/dev/null || true
if command -v pagespeed &> /dev/null; then
    pagespeed flush 'academia.paygas.com.br' 2>/dev/null || true
fi

echo "=== Verificando... ==="
sleep 2
curl -s http://127.0.0.1:3001/api/health
echo ""
curl -s http://127.0.0.1:3001/api/config
echo ""
echo "=== Deploy finalizado ==="
