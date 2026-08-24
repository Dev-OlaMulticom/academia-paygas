#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Academia PayGas - cPanel Deployment Script
# ═══════════════════════════════════════════════════════════
# Run this script locally to prepare the project for cPanel deployment
# Usage: bash scripts/deploy-cpanel.sh
# ═══════════════════════════════════════════════════════════

set -e

echo "🚀 Academia PayGas - cPanel Deployment Preparation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found, using npm${NC}"
    USE_NPM=true
else
    echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"
    USE_NPM=false
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 1/6: Installing dependencies"
echo "═══════════════════════════════════════════════════════"

if [ "$USE_NPM" = true ]; then
    npm install
else
    pnpm install
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 2/6: Generating Prisma client"
echo "═══════════════════════════════════════════════════════"

npx prisma generate

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 3/6: Compiling server (TypeScript → JavaScript)"
echo "═══════════════════════════════════════════════════════"

npx tsc --project tsconfig.server.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server compiled successfully${NC}"
else
    echo -e "${RED}❌ Server compilation failed${NC}"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 4/6: Building frontend (Vite + React)"
echo "═══════════════════════════════════════════════════════"

npx vite build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 5/6: Verifying build output"
echo "═══════════════════════════════════════════════════════"

# Check server build
if [ -f "dist/apps/api/src/server/index.js" ]; then
    echo -e "${GREEN}✅ dist/apps/api/src/server/index.js exists${NC}"
else
    echo -e "${RED}❌ dist/apps/api/src/server/index.js missing${NC}"
    exit 1
fi

# Check frontend build
if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✅ dist/index.html exists${NC}"
else
    echo -e "${RED}❌ dist/index.html missing${NC}"
    exit 1
fi

# Check assets
if [ -d "dist/assets" ]; then
    echo -e "${GREEN}✅ dist/assets/ exists${NC}"
else
    echo -e "${RED}❌ dist/assets/ missing${NC}"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 6/6: Creating deployment package"
echo "═══════════════════════════════════════════════════════"

# Create deployment directory
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy files for deployment
cp -r dist "$DEPLOY_DIR/"
cp -r prisma "$DEPLOY_DIR/"
cp -r server "$DEPLOY_DIR/"
cp -r node_modules "$DEPLOY_DIR/"
cp app.js "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp .cpanel.yml "$DEPLOY_DIR/"
cp .htaccess "$DEPLOY_DIR/"

# Copy .env if exists
if [ -f ".env" ]; then
    cp .env "$DEPLOY_DIR/"
    echo -e "${YELLOW}⚠️  .env file copied - ensure it's configured for production${NC}"
fi

# Create tar.gz
tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Deployment package ready!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Package: $DEPLOY_DIR.tar.gz"
echo ""
echo "Next steps:"
echo "  1. Upload $DEPLOY_DIR.tar.gz to cPanel via File Manager"
echo "  2. Extract in your home directory"
echo "  3. In cPanel → Setup Node.js App → Create Application"
echo "     - Node.js Version: 20 (or latest available)"
echo "     - Application Root: /home/$USER/academia-paygas"
echo "     - Application Startup File: app.js"
echo "     - Application Mode: Production"
echo "  4. Click 'Ensure Dependencies'"
echo "  5. Set environment variables in cPanel"
echo "  6. Start the application"
echo ""
echo "Or use Git Version Control:"
echo "  1. Push to Git repository"
echo "  2. In cPanel → Git Version Control → Clone"
echo "  3. cPanel will auto-deploy using .cpanel.yml"
echo ""
echo -e "${GREEN}Deploy script completed successfully!${NC}"
