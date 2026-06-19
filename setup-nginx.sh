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
# NOTA: NO incluir "location /" porque ya existe en el config principal de cPanel.
# Solo agregar "location /api/" que es mas especifico y toma precedencia.
cat > "$INCLUDE_DIR/nodejs-app.conf" << 'NGINX_EOF'
# ─── Node.js API proxy ────────────────────────────────────
# Proxy /api/* requests to Node.js backend on port 3001.
# "location /api/" es mas especifico que "location /" del config principal,
# asi que nginx lo usa primero para cualquier request que empiece con /api/.
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

# ─── Frontend SPA fallback ────────────────────────────────
# Para rutas frontend (/usuarios, /modulos, etc.) que no son /api/,
# el request cae en "location /" del config principal que proxy a Apache.
# Apache sirve archivos estaticos de dist/.
# Si el archivo no existe, Apache devuelve 404 y el browser recarga.
# Para SPA necesitamos que devuelva index.html en vez de 404.
# Esto se logra modificando el config principal (ver paso 3).
NGINX_EOF

echo "[OK] Snippet nginx creado: $INCLUDE_DIR/nodejs-app.conf"

# 3. Verificar que nginx syntax esta OK
echo "[...] Verificando sintaxis de nginx..."
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "[OK] Sintaxis de nginx correcta"
else
    echo "[FAIL] Error en sintaxis de nginx"
    echo "  Revisar: nginx -t"
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
