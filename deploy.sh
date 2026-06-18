#!/bin/bash
set -e

DEPLOY_DIR="/home/olamulticomcom/public_html/academia-paygas"
cd "$DEPLOY_DIR"

echo "=== Cargando variables de entorno ==="
set -a
source .env
set +a

echo "=== Instalando dependencias ==="
npm install --production=false

echo "=== Generando Prisma ==="
npx prisma generate
npx prisma migrate deploy

echo "=== Compilando frontend ==="
npx vite build

echo "=== Compilando servidor ==="
npx tsc --project tsconfig.server.json

echo "=== Reiniciando Node.js ==="
PID_FILE="$DEPLOY_DIR/logs/app.pid"
if [ -f "$PID_FILE" ]; then
    kill $(cat "$PID_FILE") 2>/dev/null || true
    rm -f "$PID_FILE"
fi
mkdir -p logs
nohup node dist/server/index.js > logs/app.log 2>&1 &
echo $! > logs/app.pid

echo "=== Deploy completado (PID: $(cat logs/app.pid)) ==="
echo "=== Verificando... ==="
sleep 2
curl -s http://127.0.0.1:3001/api/health
