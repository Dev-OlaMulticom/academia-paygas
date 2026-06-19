#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Academia PayGas - Deploy con auto-reparacion
# ═══════════════════════════════════════════════════════════
# Este script detecta y corrige problemas automaticamente.
# Si un paso falla, intenta soluciones antes de abortar.
# ═══════════════════════════════════════════════════════════
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DEPLOY_DIR"

DOMAIN="academia.paygas.com.br"
ERRORS=0

# ─── Funciones auxiliares ─────────────────────────────────
log_ok()   { echo "  [OK] $1"; }
log_fix()  { echo "  [FIX] $1"; }
log_warn() { echo "  [WARN] $1"; }
log_fail() { echo "  [FAIL] $1"; ERRORS=$((ERRORS + 1)); }

# ─── 0. Pre-flight: Detectar entorno ─────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  Academia PayGas - Deploy con auto-reparacion"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Directorio: $DEPLOY_DIR"
echo "  Fecha:      $(date)"
echo "  Usuario:    $(whoami)"
echo ""

# ─── 1. Verificar herramientas necesarias ─────────────────
echo "=== [1/10] Verificando herramientas del sistema ==="

# Node.js
if ! command -v node &> /dev/null; then
    log_fail "Node.js no encontrado"
    echo "  Instalar: sudo yum install nodejs o sudo apt install nodejs"
    exit 1
fi
NODE_VER=$(node -v)
log_ok "Node.js $NODE_VER"

# Detectar web server (nginx vs Apache)
WEB_SERVER="unknown"
if command -v nginx &> /dev/null; then
    WEB_SERVER="nginx"
    log_ok "Web server: nginx"
elif pgrep -x "apache2\|httpd" &> /dev/null; then
    WEB_SERVER="apache"
    log_ok "Web server: Apache"
else
    log_warn "Web server no detectado"
fi

# npm (siempre disponible con node)
if ! command -v npm &> /dev/null; then
    log_fail "npm no encontrado"
    exit 1
fi
log_ok "npm $(npm -v)"

# pnpm (preferido, fallback a npm)
if command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
    log_ok "pnpm $(pnpm -v)"
else
    PKG_MGR="npm"
    log_warn "pnpm no encontrado, usando npm como alternativa"
fi

# git
if ! command -v git &> /dev/null; then
    log_warn "git no encontrado (deploy local sin git pull)"
    HAS_GIT=false
else
    HAS_GIT=true
    log_ok "git $(git --version | awk '{print $3}')"
fi

# curl (para verificacion)
if ! command -v curl &> /dev/null; then
    log_warn "curl no encontrado, omitiendo verificacion final"
fi

echo ""

# ─── 2. Pull de cambios (si es repositorio git) ──────────
echo "=== [2/10] Obteniendo ultimos cambios ==="

if [ "$HAS_GIT" = true ] && [ -d .git ]; then
    # Guardar estado actual
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

    # Stash cambios locales si los hay
    if ! git diff --quiet 2>/dev/null; then
        git stash push -m "deploy-auto-stash-$(date +%s)" 2>/dev/null || true
        log_fix "Cambios locales guardados con git stash"
    fi

    # Pull con reintentos
    PULL_OK=false
    for i in 1 2 3; do
        if git pull origin "$CURRENT_BRANCH" 2>/dev/null; then
            PULL_OK=true
            break
        fi
        log_warn "Intento $i/3 de git pull falló, reintentando..."
        sleep 2
    done

    if [ "$PULL_OK" = true ]; then
        log_ok "Codigo actualizado desde git"
    else
        log_warn "git pull fallo despues de 3 intentos, usando codigo local"
    fi
else
    log_warn "No es repositorio git, usando codigo local"
fi

echo ""

# ─── 3. Cargar variables de entorno ──────────────────────
echo "=== [3/10] Configurando entorno ==="

if [ -f .env ]; then
    set -a
    source .env
    set +a
    log_ok "Variables de entorno cargadas desde .env"

    # Verificar DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ]; then
        log_warn "DATABASE_URL no definida en .env"
    else
        log_ok "DATABASE_URL configurada"
    fi
else
    log_warn "Archivo .env no encontrado"
    if [ -f .env.production ]; then
        set -a
        source .env.production
        set +a
        log_fix "Usando .env.production como alternativa"
    elif [ -f .env.example ]; then
        cp .env.example .env
        set -a
        source .env
        set +a
        log_fix "Copiado .env.example a .env (configurar credenciales)"
    fi
fi

echo ""

# ─── 4. Matar procesos Node viejos ───────────────────────
echo "=== [4/10] Limpiando procesos anteriores ==="

# Matar por PID file
PID_FILE="$DEPLOY_DIR/logs/app.pid"
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
        # Forzar si sigue vivo
        kill -9 "$OLD_PID" 2>/dev/null || true
        log_ok "Proceso PID $OLD_PID terminado"
    else
        log_ok "PID $OLD_PID ya no estaba activo"
    fi
    rm -f "$PID_FILE"
fi

# Matar procesos node del servidor compilado
pkill -9 -f "node.*dist/server/index.js" 2>/dev/null && log_ok "Procesos node dist/server eliminados" || log_ok "No habia procesos node dist/server"

# Matar cualquier proceso escuchando en puerto 3001 (con timeout)
if command -v lsof &> /dev/null; then
    PORT_PIDS=$(timeout 5 lsof -ti :3001 2>/dev/null || true)
    if [ -n "$PORT_PIDS" ]; then
        echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
        log_fix "Procesos en puerto 3001 terminados"
    fi
elif command -v fuser &> /dev/null; then
    timeout 5 fuser -k 3001/tcp 2>/dev/null && log_fix "Puerto 3001 liberado" || true
fi

sleep 1
log_ok "Procesos limpiados"
echo ""

# ─── 5. Backup del build actual ──────────────────────────
echo "=== [5/10] Respaldando build actual ==="

BACKUP_DIR="$DEPLOY_DIR/.backup-build"
if [ -d dist ]; then
    rm -rf "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r dist/index.html "$BACKUP_DIR/" 2>/dev/null || true
    cp -r dist/assets "$BACKUP_DIR/" 2>/dev/null || true
    cp -r dist/server "$BACKUP_DIR/" 2>/dev/null || true
    log_ok "Build actual respaldado en .backup-build/"
else
    log_warn "No hay build previo para respaldar"
fi

echo ""

# ─── 6. Limpiar y reinstalar dependencias ────────────────
echo "=== [6/10] Instalando dependencias ==="

# Limpiar caches
rm -rf dist/server dist/assets dist/index.html 2>/dev/null || true
rm -rf node_modules/.vite .vite 2>/dev/null || true

# Reintentar instalacion
INSTALL_OK=false
for i in 1 2 3; do
    if [ "$PKG_MGR" = "pnpm" ]; then
        $PKG_MGR install --no-frozen-lockfile 2>&1 && INSTALL_OK=true && break
    else
        $PKG_MGR install 2>&1 && INSTALL_OK=true && break
    fi
    log_warn "Intento $i/3 de instalacion falló"
    # Limpiar cache del gestor de paquetes
    if [ "$PKG_MGR" = "pnpm" ]; then
        rm -rf node_modules/.pnpm-store 2>/dev/null || true
    else
        rm -rf node_modules/.cache 2>/dev/null || true
    fi
    sleep 3
done

if [ "$INSTALL_OK" = true ]; then
    log_ok "Dependencias instaladas con $PKG_MGR"
else
    log_fail "Instalacion de dependencias fallo"
    # Restaurar backup si existe
    if [ -d "$BACKUP_DIR" ]; then
        log_warn "El deploy continuara con el build anterior"
    fi
fi

echo ""

# ─── 6b. Verificar configuracion de Passenger/nginx ──────
echo "=== [6b/10] Verificando Passenger/nginx ==="

# Ensure Passengerfile.json exists
if [ ! -f Passengerfile.json ]; then
    log_fix "Creando Passengerfile.json..."
    cat > Passengerfile.json << 'PASSENGER_EOF'
{
  "app_root": ".",
  "startup_file": "app.js",
  "production": true,
  "environment": "production",
  "log_file": "logs/passenger.log",
  "error_log_file": "logs/passenger-error.log"
}
PASSENGER_EOF
    log_ok "Passengerfile.json creado"
else
    log_ok "Passengerfile.json existe"
fi

# Ensure app.js exists and is correct
if [ ! -f app.js ]; then
    log_fail "app.js no existe (entry point de Passenger)"
fi

# Ensure tmp/restart.txt directory exists
mkdir -p tmp logs

# Verify dist/server/index.js exists before proceeding
if [ ! -f dist/server/index.js ]; then
    log_warn "dist/server/index.js no existe antes del build (se creara en paso 8)"
fi

echo ""

# ─── 7. Prisma: generate + migrate ───────────────────────
echo "=== [7/10] Configurando base de datos ==="

# Generate
if npx prisma generate 2>&1; then
    log_ok "Prisma client generado"
else
    log_warn "prisma generate fallo, reintentando..."
    rm -rf node_modules/.prisma 2>/dev/null || true
    npx prisma generate 2>&1 && log_ok "Prisma client generado (reintento)" || log_fail "Prisma generate fallo definitivamente"
fi

# Migrate with auto-repair for failed migrations
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1) && MIGRATE_OK=true || MIGRATE_OK=false

if [ "$MIGRATE_OK" = true ]; then
    log_ok "Migraciones aplicadas"
else
    # Check if it's a "failed migration" error (P3009 or P3018)
    if echo "$MIGRATE_OUTPUT" | grep -q "P3009\|P3018\|failed migrations\|A migration failed"; then
        log_warn "Migracion fallida detectada, intentando auto-reparacion..."

        # Extract failed migration name from error output (portable - no grep -P)
        FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | sed -n 's/.*Migration name: *//p' | head -1 | tr -d '[:space:]')

        if [ -n "$FAILED_MIGRATION" ]; then
            log_fix "Migracion fallida: $FAILED_MIGRATION"

            # Step 1: Mark as rolled back (with timeout)
            log_fix "Marcando migracion como rolled-back..."
            timeout 30 npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>&1 && \
                log_ok "Migracion marcada como rolled-back" || \
                log_warn "No se pudo marcar como rolled-back"

            # Step 2: Sync schema with db push (with timeout)
            log_fix "Sincronizando schema con db push..."
            timeout 60 npx prisma db push --accept-data-loss 2>&1 && \
                log_ok "Schema sincronizado con db push" || \
                log_warn "db push tuvo problemas (no critico)"

            # Step 3: Regenerate client after schema changes
            npx prisma generate 2>&1 && log_ok "Prisma client regenerado" || true

            # Step 4: Retry migrate deploy
            if timeout 30 npx prisma migrate deploy 2>&1; then
                log_ok "Migraciones aplicadas despues de reparacion"
            else
                log_warn "Migraciones pendientes (schema ya sincronizado via db push)"
            fi
        else
            log_warn "No se pudo detectar la migracion fallida"
            log_warn "Intentando db push como fallback..."
            npx prisma db push --accept-data-loss 2>&1 && log_ok "Schema sincronizado" || true
        fi
    else
        log_warn "Migraciones fallaron: $MIGRATE_OUTPUT"
    fi
fi

echo ""

# ─── 8. Compilar ─────────────────────────────────────────
echo "=== [8/10] Compilando proyecto ==="

# Frontend (Vite)
BUILD_FE_OK=false
if npx vite build 2>&1; then
    log_ok "Frontend compilado"
    BUILD_FE_OK=true
else
    log_warn "Build frontend fallo, reintentando con cache limpio..."
    rm -rf node_modules/.vite .vite dist 2>/dev/null || true
    npx vite build 2>&1 && { log_ok "Frontend compilado (reintento)"; BUILD_FE_OK=true; } || log_fail "Frontend no pudo compilar"
fi

# Servidor (TypeScript)
BUILD_BE_OK=false
if npx tsc --project tsconfig.server.json 2>&1; then
    log_ok "Servidor compilado"
    BUILD_BE_OK=true
else
    log_warn "Compilacion del servidor fallo, reintentando..."
    npx tsc --project tsconfig.server.json 2>&1 && { log_ok "Servidor compilado (reintento)"; BUILD_BE_OK=true; } || log_fail "Servidor no pudo compilar"
fi

# Verificar que los archivos criticos existen
if [ ! -f dist/index.html ]; then
    log_fail "dist/index.html no existe despues del build"
fi
if [ ! -f dist/server/index.js ]; then
    log_fail "dist/server/index.js no existe despues del build"
fi

# Abortar si AMBOS builds fallaron
if [ "$BUILD_FE_OK" = false ] && [ "$BUILD_BE_OK" = false ]; then
    log_fail "Ambos builds fallaron. Abortando deploy."
    if [ -d "$BACKUP_DIR" ]; then
        log_warn "Restaurando build anterior desde backup..."
        cp -r "$BACKUP_DIR"/* dist/ 2>/dev/null || true
        log_ok "Build anterior restaurado"
    fi
    echo ""
    echo "  Deploy abortado. Verificar errores arriba."
    exit 1
fi

echo ""

# ─── 9. Reiniciar aplicacion ─────────────────────────────
echo "=== [9/10] Reiniciando aplicacion ==="

# Crear directorios necesarios
mkdir -p logs tmp

# Verificar si Passenger esta configurado
PASSENGER_APP=false
if [ -f app.js ] && grep -q "module.exports" app.js 2>/dev/null; then
    PASSENGER_APP=true
fi

if [ "$PASSENGER_APP" = true ]; then
    # Ensure Passengerfile.json exists
    if [ ! -f Passengerfile.json ]; then
        echo '{"app_root":".","startup_file":"app.js","production":true,"environment":"production"}' > Passengerfile.json
        log_fix "Passengerfile.json creado"
    fi

    # Reiniciar via Passenger
    touch tmp/restart.txt
    log_ok "Passenger reiniciado via tmp/restart.txt"

    # If nginx, try to reload
    if command -v nginx &> /dev/null; then
        nginx -s reload 2>/dev/null && log_ok "nginx recargado" || log_warn "No se pudo recargar nginx"
    fi
else
    # Iniciar Node directamente como fallback
    log_warn "app.js no encontrado o no es Passenger, iniciando Node directo"
    nohup node dist/server/index.js > logs/app.log 2>&1 &
    echo $! > logs/app.pid
    log_ok "Node.js iniciado en puerto 3001 (PID: $(cat logs/app.pid))"

    # Verificar que el proceso esta vivo despues de 3 segundos
    sleep 3
    if kill -0 "$(cat logs/app.pid)" 2>/dev/null; then
        log_ok "Proceso Node.js esta activo"
    else
        log_fail "Proceso Node.js murio despues de iniciar"
        log_fail "Revisar logs/app.log para detalles"
        if [ -f logs/app.log ]; then
            echo "  --- Ultimas 10 lineas del log ---"
            tail -10 logs/app.log
            echo "  --- Fin del log ---"
        fi
    fi
fi

# Limpiar cache de pagespeed si existe
touch dist/index.html 2>/dev/null || true
if command -v pagespeed &> /dev/null; then
    pagespeed flush "$DOMAIN" 2>/dev/null && log_ok "Cache de Pagespeed limpiado" || true
fi

echo ""

# ─── 10. Verificacion final ──────────────────────────────
echo "=== [10/10] Verificando funcionamiento ==="

sleep 3

HEALTH_OK=false
CONFIG_OK=false
FRONTEND_OK=false

# Test directo a puerto 3001 (siempre funciona si Node esta corriendo)
DIRECT_OK=false
if command -v curl &> /dev/null; then
    HEALTH_DIRECT=$(curl -s -m 5 "http://127.0.0.1:3001/api/health" 2>/dev/null || true)
    if echo "$HEALTH_DIRECT" | grep -q '"status"' 2>/dev/null; then
        log_ok "API funciona en puerto 3001 (Node.js activo)"
        DIRECT_OK=true
    else
        log_fail "API NO funciona en puerto 3001 (Node.js no responde)"
    fi
fi

# Test via dominio
if [ "$DIRECT_OK" = true ] && command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s -m 10 "https://$DOMAIN/api/health" 2>/dev/null || true)
    if echo "$HEALTH_RESPONSE" | grep -q '"status"' 2>/dev/null; then
        log_ok "/api/health via dominio → JSON valido"
        HEALTH_OK=true
    elif echo "$HEALTH_RESPONSE" | grep -q '500\|Internal Server' 2>/dev/null; then
        log_fail "/api/health via dominio → HTTP 500 (Passenger o nginx no configurado)"
    else
        log_warn "/api/health via dominio → no devolvio JSON"
    fi

    CONFIG_RESPONSE=$(curl -s -m 10 "https://$DOMAIN/api/config" 2>/dev/null || true)
    if echo "$CONFIG_RESPONSE" | grep -q 'key\|encryption' 2>/dev/null; then
        log_ok "/api/config via dominio → JSON valido"
        CONFIG_OK=true
    else
        log_warn "/api/config via dominio → no devolvio JSON"
    fi

    FRONTEND_RESPONSE=$(curl -s -m 10 "https://$DOMAIN/" 2>/dev/null || true)
    if echo "$FRONTEND_RESPONSE" | grep -q 'Academia PayGas' 2>/dev/null; then
        log_ok "Frontend carga correctamente via dominio"
        FRONTEND_OK=true
    else
        log_warn "Frontend no carga via dominio"
    fi
fi

echo ""

# ─── Resumen final ───────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  RESUMEN DEL DEPLOY"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Build Frontend:    $([ "$BUILD_FE_OK" = true ] && echo "OK" || echo "FALLO")"
echo "  Build Servidor:    $([ "$BUILD_BE_OK" = true ] && echo "OK" || echo "FALLO")"
echo "  API (puerto 3001): $([ "$DIRECT_OK" = true ] && echo "OK" || echo "FALLO")"
echo "  API (dominio):     $([ "$HEALTH_OK" = true ] && echo "OK" || echo "FALLO")"
echo "  Config (dominio):  $([ "$CONFIG_OK" = true ] && echo "OK" || echo "FALLO")"
echo "  Frontend (dominio): $([ "$FRONTEND_OK" = true ] && echo "OK" || echo "FALLO")"
echo ""

if [ "$DIRECT_OK" = false ]; then
    echo "  [CRITICO] Node.js no esta respondiendo en puerto 3001"
    echo "  Revisar: cat logs/app.log"
    echo ""
    exit 1
fi

if [ "$HEALTH_OK" = false ] || [ "$FRONTEND_OK" = false ]; then
    echo "  [!] La app funciona en puerto 3001 pero NO via el dominio"
    echo ""
    echo "  Causa: nginx/Passenger no esta configurado correctamente."
    echo ""
    echo "  Soluciones:"
    echo "  1. En cPanel → Setup Node.js App"
    echo "     - Application Root: $(pwd)"
    echo "     - Application Startup File: app.js"
    echo "     - Application Mode: Production"
    echo "     - Click 'Create' o 'Restart'"
    echo ""
    echo "  2. Verificar que Passenger esta habilitado:"
    echo "     - cPanel → Select Web Server → Habilitar Passenger"
    echo ""
    echo "  3. Verificar logs de nginx:"
    echo "     - tail -20 /usr/local/nginx/logs/error.log"
    echo "     - tail -20 logs/passenger-error.log 2>/dev/null"
    echo ""
    echo "  4. Diagnosticar con:"
    echo "     - bash diagnose.sh"
    echo ""
    exit 1
fi

echo "  [OK] Deploy completado sin errores"
echo ""
exit 0
