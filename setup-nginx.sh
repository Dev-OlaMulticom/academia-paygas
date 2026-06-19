#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Academia PayGas - Configurar nginx para Node.js
# ═══════════════════════════════════════════════════════════
# Ejecutar como root en el servidor.
# Crea un snippet de nginx que proxy /api/* a Node.js
# y sirve el frontend desde dist/ directamente.
# ═══════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="academia.paygas.com.br"
USER="olamulticomcom"
APP_DIR="/home/$USER/public_html/academia-paygas"
NGINX_CONF="/etc/nginx/conf.d/users/$USER.conf"
INCLUDE_DIR="/etc/nginx/conf.d/users/$USER/${DOMAIN}.olamulticom.com.br"

echo "=== Configurando nginx para $DOMAIN ==="

# 1. Crear directorio de includes si no existe
mkdir -p "$INCLUDE_DIR"
echo "[OK] Directorio de includes creado: $INCLUDE_DIR"

# 2. Crear snippet de nginx para Node.js
cat > "$INCLUDE_DIR/nodejs-app.conf" << 'NGINX_EOF'
# ─── Node.js API proxy ────────────────────────────────────
# Proxy /api/* requests to Node.js backend on port 3001
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
    proxy_connect_timeout 10s;
}

# ─── Frontend static files ────────────────────────────────
# Serve React SPA from dist/ directly (bypass Apache)
location / {
    root "/home/olamulticomcom/public_html/academia-paygas/dist";
    try_files $uri $uri/ /index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

echo "[OK] Snippet nginx creado: $INCLUDE_DIR/nodejs-app.conf"

# 3. Verificar que nginx syntax esta OK
echo "[...] Verificando sintaxis de nginx..."
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "[OK] Sintaxis de nginx correcta"
else
    echo "[FAIL] Error en sintaxis de nginx"
    exit 1
fi

# 4. Recargar nginx
echo "[...] Recargando nginx..."
nginx -s reload 2>&1
echo "[OK] nginx recargado"

# 5. Verificar que el dominio funciona
echo ""
echo "=== Verificando ==="
sleep 2

HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "https://$DOMAIN/" 2>/dev/null || echo "000")

echo "  /api/health → HTTP $HEALTH_CODE"
echo "  /            → HTTP $FRONTEND_CODE"

if [ "$HEALTH_CODE" = "200" ]; then
    echo ""
    echo "[OK] API funciona via dominio!"
    curl -s "https://$DOMAIN/api/health" 2>/dev/null | head -1
fi

if [ "$FRONTEND_CODE" = "200" ]; then
    echo "[OK] Frontend carga via dominio!"
fi

echo ""
echo "=== Configuracion completada ==="
