# Verification — Guía de Verificación y Testing

## 🎯 Objetivo

Definir criterios claros para verificar que el código funciona correctamente antes de cerrar tareas.

## ⚠️ Limitación del proyecto

**No hay test framework.** La verificación es manual via:

- API health check
- Seed data testing
- Manual flow testing

## 📋 Criterios de cierre de tarea

Una tarea solo se considera completa cuando:

### ✅ Criterios obligatorios

1. **El código compila sin errores**
   ```bash
   pnpm build
   ```

2. **Lint pasa sin errores** (warnings aceptables)
   ```bash
   pnpm lint
   ```

3. **Typecheck pasa sin errores**
   ```bash
   npx tsc --noEmit                           # Frontend
   npx tsc --project tsconfig.server.json --noEmit  # Backend
   ```

4. **Build funciona**
   ```bash
   pnpm build
   ```

5. **Documentation actualizada** (si aplica)
   - AGENTS.md para cambios de arquitectura
   - Comentarios en código para lógica compleja
   - Commit messages descriptivos

6. **Memoria del proyecto actualizada** (si aplica)
   - Registrar decisiones técnicas en codebase-memory-mcp
   - Registrar patrones reutilizables
   - Documentar gotchas

### ✅ Criterios específicos por tipo de cambio

#### Database changes

- ✅ Migration creada y aplicada
   ```bash
   npx prisma migrate deploy
   ```

- ✅ Seed data actualizado (si aplica)
   ```bash
   pnpm db:seed
   ```

- ✅ Backward compatibility verificada
   - Datos existentes no se rompen
   - API endpoints no rompen

#### API changes

- ✅ API health check pasa
   ```bash
   curl http://localhost:3001/api/health
   ```

- ✅ Endpoint específico testeado
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3001/api/endpoint
   ```

- ✅ Error handling verificado
   - Respuestas de error apropiadas
   - Status codes correctos

#### Frontend changes

- ✅ Componente renderiza sin errores
- ✅ Interacciones funcionan correctamente
- ✅ Responsive design verificado (si aplica)
- ✅ Accessibility check básico (si aplica)

#### Security changes

- ✅ Authentication still works
- ✅ Authorization still works
- ✅ No new vulnerabilities introduced
- ✅ Secrets no expuestos en código

#### Performance changes

- ✅ No degradation de performance
- ✅ Memory leaks verificados (si aplica)
- ✅ Database queries optimizados (si aplica)

---

## 🔧 Comandos de verificación

### Pre-flight checks

```bash
# Verificar pnpm instalado
pnpm --version

# Verificar dependencias instaladas
pnpm install

# Verificar archivo .env existe
ls .env
```

### Lint

```bash
# Check lint
pnpm lint

# Fix lint auto
pnpm lint:fix

# Format code
pnpm format
```

### Typecheck

```bash
# Frontend typecheck
npx tsc --noEmit

# Backend typecheck
npx tsc --project tsconfig.server.json --noEmit
```

### Build

```bash
# Full build
pnpm build

# Frontend build only
npx vite build

# Backend build only
npx tsc --project tsconfig.server.json
```

### Database

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Seed test data
pnpm db:seed

# Reset database (dev only)
pnpm db:reset
```

### Runtime verification

```bash
# Start server
pnpm start

# Health check
curl http://localhost:3001/api/health

# Test specific endpoint
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/endpoint
```

---

## 🧪 Manual testing procedures

### API endpoint testing

#### 1. Authentication test

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@paygas.com.br","password":"123456"}'

# Should return: { token, user }
```

#### 2. Protected endpoint test

```bash
# Get users (requires auth)
curl -X GET http://localhost:3001/api/usuarios \
  -H "Authorization: Bearer <token>"

# Should return: array of users
```

#### 3. Error handling test

```bash
# Test with invalid token
curl -X GET http://localhost:3001/api/usuarios \
  -H "Authorization: Bearer invalid-token"

# Should return: 401 Unauthorized
```

### Frontend testing

#### 1. Component rendering

1. Start dev server: `pnpm dev:client`
2. Navigate to page with component
3. Verify component renders without errors
4. Check browser console for errors

#### 2. User flow testing

1. Login with test user
2. Navigate through application
3. Perform actions (create, update, delete)
4. Verify expected behavior

#### 3. Responsive testing

1. Open DevTools (F12)
2. Toggle device toolbar
3. Test at different breakpoints:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)

### Database testing

#### 1. Migration testing

```bash
# Apply migration
npx prisma migrate deploy

# Verify schema
npx prisma studio

# Check that tables/columns exist
```

#### 2. Seed data testing

```bash
# Seed database
pnpm db:seed

# Verify data exists
npx prisma studio

# Or query directly
```

#### 3. DAL testing

```bash
# Test DAL operations via API
curl -X POST http://localhost:3001/api/usuarios \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nome":"Test","senha":"123456","role":"ATENDENTE"}'

# Verify user created
curl -X GET http://localhost:3001/api/usuarios \
  -H "Authorization: Bearer <token>"
```

---

## 🚨 Common issues and solutions

### Lint errors

#### Issue: Biome lint errors

**Solution:**
```bash
# Auto-fix
pnpm lint:fix

# Or format
pnpm format
```

#### Issue: Unused variables

**Solution:**
- Remove unused variables
- Or prefix with underscore if intentional: `_unusedVar`

#### Issue: useExhaustiveDependencies warnings

**Solution:**
- Wrap function in useCallback
- Or remove from dependency array if intentional

### Typecheck errors

#### Issue: TypeScript errors

**Solution:**
- Fix type mismatches
- Add proper type annotations
- Use `any` only as last resort

#### Issue: Module not found

**Solution:**
- Verify import paths
- Check path aliases in tsconfig.json
- Verify file exists

### Build errors

#### Issue: Build fails

**Solution:**
```bash
# Clean build
rm -rf dist
pnpm build

# Or rebuild individual parts
npx vite build
npx tsc --project tsconfig.server.json
```

#### Issue: Prisma generation fails

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# If still fails, check DATABASE_URL
cat .env | grep DATABASE_URL
```

### Runtime errors

#### Issue: Server won't start

**Solution:**
```bash
# Check port 3001 is not in use
lsof -i :3001

# Check .env file
cat .env

# Check database connection
npx prisma migrate deploy
```

#### Issue: API returns 500

**Solution:**
- Check server logs
- Verify database connection
- Check environment variables

---

## 📊 Verification checklist

### Antes de cerrar tarea

- [ ] Código compila sin errores
- [ ] Lint pasa sin errores
- [ ] Typecheck pasa sin errores
- [ ] Build funciona
- [ ] API health check pasa
- [ ] Endpoints específicos testeados
- [ ] Error handling verificado
- [ ] Database migrations aplicadas (si aplica)
- [ ] Seed data actualizado (si aplica)
- [ ] Documentation actualizada (si aplica)
- [ ] Memoria del proyecto actualizada (si aplica)
- [ ] No regression en features existentes
- [ ] Security no comprometida
- [ ] Performance no degradada

### Para cambios específicos

#### Database changes
- [ ] Migration creada
- [ ] Migration aplicada
- [ ] Backward compatibility verificada
- [ ] Seed data actualizado

#### API changes
- [ ] Health check pasa
- [ ] Endpoints testeados
- [ ] Error handling verificado
- [ ] Documentation actualizada

#### Frontend changes
- [ ] Componentes renderizan
- [ ] Interacciones funcionan
- [ ] Responsive verificado
- [ ] Console sin errores

#### Security changes
- [ ] Authentication works
- [ ] Authorization works
- [ ] No new vulnerabilities
- [ ] Secrets not exposed

---

## 🎯 Quick verification flow

Para cambios pequeños (1-2 archivos):

```bash
# 1. Lint
pnpm lint

# 2. Typecheck
npx tsc --noEmit
npx tsc --project tsconfig.server.json --noEmit

# 3. Build
pnpm build

# 4. Start server
pnpm start

# 5. Test API
curl http://localhost:3001/api/health
```

Para cambios grandes:

```bash
# 1. Lint
pnpm lint

# 2. Typecheck
npx tsc --noEmit
npx tsc --project tsconfig.server.json --noEmit

# 3. Build
pnpm build

# 4. Database (si aplica)
npx prisma migrate deploy
pnpm db:seed

# 5. Start server
pnpm start

# 6. Comprehensive testing
# - API health check
# - All affected endpoints
# - User flows
# - Error scenarios

# 7. Stop server
# Ctrl+C
```

---

## 📝 Integración con Task Master AI

Al cerrar una tarea en Task Master AI:

```bash
npx task-master set-status --id=<id> --status=done
```

Solo cerrar después de verificar:

- ✅ Todos los criterios obligatorios cumplidos
- ✅ Criterios específicos por tipo de cambio cumplidos
- ✅ Verification checklist completo

---

## 🚨 When to fail verification

### No cerrar tarea si:

- Lint tiene errores (no warnings)
- Typecheck tiene errores
- Build falla
- API health check falla
- Endpoints retornan errores
- Database migrations fallan
- Security compromised
- Performance degraded significativamente
- Regression en features existentes

### Sí cerrar tarea si:

- Lint tiene warnings aceptables
- Todos los tests manuales pasan
- Documentation actualizada
- Memoria actualizada
- No breaking changes

---

## 📚 Recursos adicionales

- **AGENTS.md**: Comandos del proyecto
- **patterns.md**: Patrones reutilizables
- **workflow.md**: Flujo de desarrollo
- **instructions.md**: Políticas del agente
- **memory.md**: Uso de memoria persistente
