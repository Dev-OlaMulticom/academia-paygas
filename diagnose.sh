#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Academia PayGas - Diagnostico nginx + Passenger
# ═══════════════════════════════════════════════════════════
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

DOMAIN="academia.paygas.com.br"
PASS=0
WARN=0
FAIL=0

ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "═══════════════════════════════════════════════════════"
echo "  Diagnostico nginx + Passenger"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── 1. Archivos criticos ────────────────────────────────
echo "=== Archivos criticos ==="

[ -f app.js ] && ok "app.js existe" || fail "app.js NO existe"
[ -f Passengerfile.json ] && ok "Passengerfile.json existe" || fail "Passengerfile.json NO existe"
[ -f dist/server/index.js ] && ok "dist/server/index.js compilado" || fail "dist/server/index.js NO existe (ejecutar build)"
[ -f dist/index.html ] && ok "dist/index.html compilado" || fail "dist/index.html NO existe (ejecutar build)"
[ -f .env ] && ok ".env existe" || fail ".env NO existe"
[ -f tmp/restart.txt ] && ok "tmp/restart.txt existe" || warn "tmp/restart.txt no existe (Passenger no reiniciado)"
echo ""

# ─── 2. Permisos ─────────────────────────────────────────
echo "=== Permisos ==="

APP_PERMS=$(stat -c %a app.js 2>/dev/null || echo "000")
[ "$APP_PERMS" = "755" ] || [ "$APP_PERMS" = "644" ] && ok "app.js permisos: $APP_PERMS" || warn "app.js permisos inusuales: $APP_PERMS"

DIST_PERMS=$(stat -c %a dist/ 2>/dev/null || echo "000")
ok "dist/ permisos: $DIST_PERMS"
echo ""

# ─── 3. Node.js processes ────────────────────────────────
echo "=== Procesos Node.js ==="

NODE_PROCS=$(pgrep -fa "node" 2>/dev/null | grep -v "pgrep" || true)
if [ -n "$NODE_PROCS" ]; then
    ok "Procesos node encontrados:"
    echo "$NODE_PROCS" | while read -r line; do echo "    $line"; done
else
    warn "No hay procesos node ejecutandose"
fi
echo ""

# ─── 4. Puerto 3001 ─────────────────────────────────────
echo "=== Puerto 3001 ==="

if command -v ss &> /dev/null; then
    PORT_INFO=$(ss -tlnp | grep ":3001" 2>/dev/null || true)
elif command -v netstat &> /dev/null; then
    PORT_INFO=$(netstat -tlnp 2>/dev/null | grep ":3001" || true)
else
    PORT_INFO=""
fi

if [ -n "$PORT_INFO" ]; then
    ok "Puerto 3001 en uso:"
    echo "$PORT_INFO" | while read -r line; do echo "    $line"; done
else
    warn "Puerto 3001 no esta en uso (Node no iniciado)"
fi
echo ""

# ─── 5. Test API directo ─────────────────────────────────
echo "=== Test API (directo a puerto 3001) ==="

HEALTH_DIRECT=$(curl -s -m 5 http://127.0.0.1:3001/api/health 2>/dev/null || true)
if echo "$HEALTH_DIRECT" | grep -q '"status"'; then
    ok "/api/health en puerto 3001: JSON valido"
else
    fail "/api/health en puerto 3001: no responde o error"
fi
echo ""

# ─── 6. Test via dominio ─────────────────────────────────
echo "=== Test via dominio ==="

DOMAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "https://$DOMAIN/" 2>/dev/null || echo "000")
case "$DOMAIN_CODE" in
    200) ok "https://$DOMAIN/ → HTTP 200" ;;
    301|302) warn "https://$DOMAIN/ → redirect ($DOMAIN_CODE)" ;;
    500) fail "https://$DOMAIN/ → HTTP 500 ( Passenger o nginx error)" ;;
    000) fail "https://$DOMAIN/ → No responde (DNS o firewall)" ;;
    *) warn "https://$DOMAIN/ → HTTP $DOMAIN_CODE" ;;
esac

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
case "$API_CODE" in
    200) 
        API_BODY=$(curl -s -m 10 "https://$DOMAIN/api/health" 2>/dev/null || true)
        if echo "$API_BODY" | grep -q '"status"'; then
            ok "https://$DOMAIN/api/health → JSON valido"
        else
            warn "https://$DOMAIN/api/health → 200 pero no es JSON"
        fi
        ;;
    500) fail "https://$DOMAIN/api/health → HTTP 500" ;;
    000) fail "https://$DOMAIN/api/health → No responde" ;;
    *) warn "https://$DOMAIN/api/health → HTTP $API_CODE" ;;
esac
echo ""

# ─── 7. Passenger status ─────────────────────────────────
echo "=== Passenger ==="

if command -v passenger &> /dev/null; then
    ok "Passenger CLI encontrado: $(which passenger)"
    passenger-status 2>/dev/null && ok "Passenger status OK" || warn "passenger-status fallo"
elif [ -f /usr/sbin/passenger &> /dev/null ]; then
    ok "Passenger encontrado en /usr/sbin/"
else
    warn "Passenger CLI no encontrado (puede estar integrado en nginx)"
fi

# Check for Passenger temp files
if [ -d /tmp/passenger* ] 2>/dev/null || ls /tmp/passenger* 2>/dev/null; then
    ok "Passenger temp files found"
else
    warn "No Passenger temp files found"
fi
echo ""

# ─── 8. nginx config ────────────────────────────────────
echo "=== nginx ==="

if command -v nginx &> /dev/null; then
    ok "nginx encontrado: $(nginx -v 2>&1)"
    nginx -t 2>&1 && ok "nginx config test: OK" || fail "nginx config test: ERROR"
else
    warn "nginx CLI no encontrado (puede estar en otro path)"
fi

# Check common nginx config locations
for conf_dir in /etc/nginx /usr/local/nginx/conf /opt/cpanel/ea-nginx/root/etc/nginx; do
    if [ -d "$conf_dir" ]; then
        ok "nginx config dir encontrado: $conf_dir"
        # Check if there's a site config for this domain
        if grep -rl "$DOMAIN\|academia" "$conf_dir" 2>/dev/null | head -3; then
            ok "Config de nginx para $DOMAIN encontrado"
        fi
    fi
done
echo ""

# ─── 9. Logs ─────────────────────────────────────────────
echo "=== Logs recientes ==="

for log_file in logs/app.log logs/passenger.log logs/passenger-error.log logs/error.log; do
    if [ -f "$log_file" ]; then
        LINES=$(wc -l < "$log_file")
        ok "$log_file ($LINES lineas)"
        LAST_ERROR=$(grep -i "error\|fatal\|crash" "$log_file" 2>/dev/null | tail -3 || true)
        if [ -n "$LAST_ERROR" ]; then
            warn "Ultimos errores en $log_file:"
            echo "$LAST_ERROR" | while read -r line; do echo "    $line"; done
        fi
    fi
done
echo ""

# ─── Resumen ─────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  RESUMEN: $PASS OK | $WARN advertencias | $FAIL fallos"
echo "═══════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "  Acciones recomendadas:"
    echo "  1. Verificar que Passenger esta habilitado en cPanel"
    echo "  2. En cPanel → Setup Node.js App → Application Startup File = app.js"
    echo "  3. Verificar logs de nginx: /usr/local/nginx/logs/error.log"
    echo "  4. Ejecutar: cat logs/app.log"
    exit 1
fi
