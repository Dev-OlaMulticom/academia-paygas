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

# 2. Crear snippet de nginx para Node.js + Frontend
# NOTA: NO incluir "location /" porque ya existe en el config principal de cPanel.
# Usamos locations mas especificos que toman precedencia sobre "location /".
cat > "$INCLUDE_DIR/nodejs-app.conf" << 'NGINX_EOF'
# ─── Node.js API proxy ────────────────────────────────────
# "location /api/" es mas especifico que "location /" del config principal.
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

# ─── Frontend: servir assets estaticos directamente ───────
# "location ^~" tiene mayor precedencia que prefix y regex locations.
location ^~ /assets/ {
    root /home/olamulticomcom/public_html/academia-paygas/dist;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# ─── Frontend: archivos estaticos en raiz ─────────────────
# Icons, images, etc. en la raiz de dist/
location ~* \.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map|webp)$ {
    root /home/olamulticomcom/public_html/academia-paygas/dist;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
NGINX_EOF

echo "[OK] Snippet nginx creado: $INCLUDE_DIR/nodejs-app.conf"

# 3. Modificar el config principal de nginx para este dominio
# Reemplazar "location /" del bloque de academia.paygas.com.br
# para que sirva desde dist/ en vez de proxea a Apache.
NGINX_MAIN="/etc/nginx/conf.d/users/$USER.conf"

echo "[...] Modificando config principal de nginx..."

# Backup del config original
if [ ! -f "${NGINX_MAIN}.bak-academia" ]; then
    cp "$NGINX_MAIN" "${NGINX_MAIN}.bak-academia"
    echo "[OK] Backup creado: ${NGINX_MAIN}.bak-academia"
fi

# Usar perl para reemplazar el location / dentro del bloque server de academia
# Busca: desde "server_name ... academia.paygas.com.br" hasta el "}" de ese server block
# Reemplaza SOLO el "location /" que esta dentro de ese bloque
perl -i -0pe '
    # Solo reemplazar dentro del bloque server de academia.paygas.com.br
    s/(server\s*\{[^}]*server_name[^"]*academia\.paygas\.com\.br[^}]*\{.*?)(location\s*/\s*\{\s*\n\s*include\s+conf\.d\/includes-optional\/cpanel-proxy\.conf;\s*\n\s*proxy_pass\s+\$CPANEL_APACHE_PROXY_PASS;\s*\n\s*\})/$1location \/ {\n        root "\/home\/olamulticomcom\/public_html\/academia-paygas\/dist";\n        try_files \$uri \$uri\/ \/index.html;\n\n        include conf.d\/includes-optional\/cpanel-proxy.conf;\n        proxy_pass \$CPANEL_APACHE_PROXY_PASS;\n    }/
' "$NGINX_MAIN" 2>/dev/null

# Verificar si perl hizo el cambio
if grep -q 'academia-paygas/dist' "$NGINX_MAIN"; then
    echo "[OK] Config principal modificado: location / ahora sirve desde dist/"
else
    echo "[WARN] No se pudo modificar el config con perl"
    echo "  Se usara solo el snippet (API + assets estaticos)"
fi

echo ""

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

# 5. Fix .htaccess: eliminar ProxyTimeout/Timeout que causan 500 en Apache
echo "=== [5] Corrigiendo .htaccess ==="

HTACCESS="$APP_DIR/.htaccess"
if [ -f "$HTACCESS" ]; then
    if grep -q "ProxyTimeout" "$HTACCESS"; then
        sed -i '/ProxyTimeout /d' "$HTACCESS"
        sed -i '/Timeout 30/d' "$HTACCESS"
        echo "[OK] ProxyTimeout/Timeout eliminados del .htaccess"
        # Recargar Apache
        systemctl reload httpd 2>/dev/null && echo "[OK] Apache recargado" || true
    else
        echo "[OK] .htaccess ya corregido"
    fi
else
    echo "[WARN] .htaccess no encontrado"
fi

echo ""

# 6. Verificar que el dominio funciona
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
