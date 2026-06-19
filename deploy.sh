#!/bin/bash
set -e

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
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

echo "=== Reiniciando Passenger (Phusion) ==="
mkdir -p tmp
touch tmp/restart.txt
echo "Passenger reiniciado via tmp/restart.txt"

echo "=== Deploy completado ==="

echo "=== Limpiando cache Apache ==="
touch dist/index.html 2>/dev/null || true
if command -v pagespeed &> /dev/null; then
    pagespeed flush 'academia.paygas.com.br' 2>/dev/null || true
fi

echo "=== Verificando... ==="
sleep 3
curl -s https://academia.paygas.com.br/api/health
echo ""
curl -s https://academia.paygas.com.br/api/config
echo ""
echo "=== Deploy finalizado ==="
