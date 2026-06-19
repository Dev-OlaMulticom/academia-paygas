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

# Usar sed para reemplazar el location / del bloque de academia.paygas.com.br
# El location / esta entre el server_name de academia y los includes
# Buscamos el patron especifico y lo reemplazamos
FOUND=false

# Buscar la linea del "location /" que esta en el bloque de academia
# (despues de server_name academia.paygas.com.br y antes de los includes)
LINE_NUM=$(awk '
    /server_name.*academia\.paygas\.com\.br/ { in_academia=1 }
    in_academia && /^    location \/ \{/ { print NR; exit }
' "$NGINX_MAIN" 2>/dev/null)

if [ -n "$LINE_NUM" ]; then
    # Encontrar la linea de cierre del location / (la linea con solo "}")
    END_LINE=$(awk -v start="$LINE_NUM" 'NR > start && /^    \}$/ { print NR; exit }' "$NGINX_MAIN" 2>/dev/null)

    if [ -n "$END_LINE" ]; then
        # Reemplazar el bloque location / desde LINE_NUM hasta END_LINE
        sed -i "${LINE_NUM},${END_LINE}c\\
    location / {\\
        root \"/home/olamulticomcom/public_html/academia-paygas/dist\";\\
        try_files \\\$uri \\\$uri/ /index.html;\\
\\
        include conf.d/includes-optional/cpanel-proxy.conf;\\
        proxy_pass \\\$CPANEL_APACHE_PROXY_PASS;\\
    }" "$NGINX_MAIN"
        FOUND=true
        echo "[OK] Config principal modificado: location / en linea $LINE_NUM"
    fi
fi

if [ "$FOUND" = false ]; then
    echo "[WARN] No se encontro el location / del bloque de academia"
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

# 5. Fix .htaccess: PageSpeed Off + no-cache
echo "=== [5] Corrigiendo .htaccess ==="

HTACCESS="$APP_DIR/.htaccess"
cat > "$HTACCESS" << 'HTACCESS_EOF'
# Academia PayGas - Security Rules for Apache

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} \.pagespeed\.
    RewriteRule ^ - [R=404,L]
</IfModule>

<FilesMatch "^(\.env|\.git|\.htaccess|\.htpasswd|\.gitignore)$">
    Require all denied
</FilesMatch>
<FilesMatch "\.env">
    Require all denied
</FilesMatch>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^node_modules/ - [F,L]
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^prisma/ - [F,L]
    RewriteRule ^server/ - [F,L]
    RewriteRule \.(ts|tsx)$ - [F,L]
    RewriteRule ^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig.*\.json|vite\.config\.ts|tailwind\.config\.ts|postcss\.config\.mjs|prisma\.config\.ts|eslint\.config\.js|components\.json)$ - [F,L]
    RewriteRule \.(sh)$ - [F,L]
    RewriteRule ^logs/ - [F,L]
    RewriteRule ^scripts/ - [F,L]
    RewriteRule \.(zip|tar\.gz|bak|sql)$ - [F,L]
    RewriteRule ^wordpress-plugin-academia-paygas - [F,L]
    RewriteRule ^test-api\.js$ - [F,L]
    RewriteRule ^(design\.md|RESULTADO_ANALISIS\.md|SECURITY_CHANGES\.md|DEPLOY-CPANEL\.md|agents\.md)$ - [F,L]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType application/json "access plus 1 hour"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
HTACCESS_EOF
echo "[OK] .htaccess reconstruido con PageSpeed Off + no-cache"

cp "$HTACCESS" "$APP_DIR/dist/.htaccess" 2>/dev/null && echo "[OK] .htaccess copiado a dist/" || true

systemctl reload httpd 2>/dev/null && echo "[OK] Apache recargado" || true

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
