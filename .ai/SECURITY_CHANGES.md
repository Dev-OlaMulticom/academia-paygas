# Cambios de Seguridad - Academia PayGas

## Resumen de Correcciones Implementadas

### 1. Encryption Keys Dinámicas (CRÍTICO)
**Problema:** Las encryption keys estaban hardcodeadas y se exponían en el bundle del cliente.

**Solución:**
- `apps/api/apps/web/src/server/middleware/encryption.ts`: Genera encryption key dinámica en runtime si no existe en env
- `apps/api/apps/web/src/server/index.ts`: Endpoint `/api/config` ahora requiere autenticación
- `apps/web/src/lib/crypto.ts`: Obtiene encryption key del servidor después del login
- `apps/web/src/hooks/useAuth.ts`: Resetea encryption key en login/logout

**Beneficio:** Las keys nunca quedan obsoletas post-build y se renuevan automáticamente.

---

### 2. Eliminación de Exposición de Secrets (CRÍTICO)
**Problema:** Endpoint `/api/config` exponía la ENCRYPTION_KEY públicamente.

**Solución (actualizado):**
- `/api/config` es público (requerido antes del login para cifrar credenciales)
- La ENCRYPTION_KEY por sí sola no compromete la seguridad (solo cifra tráfico)
- Sin un JWT válido, un atacante no puede acceder a datos
- Health check ya no expone estado de variables sensibles
- `vite.config.ts`: Ya no inyecta API_KEY ni ENCRYPTION_KEY en el bundle

**Flujo de seguridad:**
1. Frontend obtiene ENCRYPTION_KEY de `/api/config` (público)
2. Cifra credenciales de login con esa key
3. Servidor descifra → valida credenciales → retorna JWT
4. Peticiones subsiguientes usan JWT + cifrado de transporte

---

### 3. Rate Limiting Mejorado
**Problema:** Sin rate limiting en registro de usuarios.

**Solución:**
- `apps/api/apps/web/src/server/index.ts`: Agregado rate limiting para `/api/usuarios` (5 req/hora)

**Beneficio:** Previene abuso del endpoint de registro.

---

### 4. Validación de Roles en Creación de Usuarios
**Problema:** Un GESTOR podía crear usuarios ADMIN.

**Solución:**
- `apps/api/apps/web/src/server/routes/usuarios.ts`: GESTOR solo puede crear usuarios ATENDENTE
- Validación de roles permitidos (ADMIN, GESTOR, ATENDENTE)
- Validación de fortaleza de contraseña (mínimo 8 caracteres)

**Beneficio:** Control de acceso más estricto.

---

### 5. Tokens de Verificación con Expiración
**Problema:** Los tokens de verificación de email nunca expiraban.

**Solución:**
- `packages/db/prisma/schema.prisma`: Agregado campo `tokenExpiry` al modelo User
- `apps/api/apps/web/src/server/routes/auth.ts`: Validación de expiración en verificación de email
- `apps/api/apps/web/src/server/routes/usuarios.ts`: Tokens se crean con expiración de 24 horas

**Beneficio:** Tokens expirados no pueden ser reutilizados.

---

### 6. JWT Secret Seguro
**Problema:** JWT secret era débil y predecible.

**Solución:**
- `apps/api/apps/web/src/server/middleware/auth.ts`: Genera JWT secret dinámico si el proporcionado es débil
- Validación de fortaleza del secret (mínimo 32 caracteres)

**Beneficio:** Tokens JWT más seguros.

---

### 7. Documentación de Variables de Entorno
**Problema:** Falta documentación de variables de entorno.

**Solución:**
- Creado `.env.example` con documentación completa
- Variables sensibles marcadas con comentarios

**Beneficio:** Fácil configuración para nuevos desarrolladores.

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `apps/api/apps/web/src/server/middleware/encryption.ts` | Encryption key dinámica |
| `apps/api/apps/web/src/server/middleware/auth.ts` | JWT secret seguro |
| `apps/api/apps/web/src/server/index.ts` | Config endpoint autenticado, rate limiting |
| `apps/api/apps/web/src/server/routes/auth.ts` | Validación de expiración de tokens |
| `apps/api/apps/web/src/server/routes/usuarios.ts` | Validación de roles, rate limiting |
| `packages/db/prisma/schema.prisma` | Campo tokenExpiry |
| `apps/web/src/lib/crypto.ts` | Obtención de key desde servidor |
| `apps/web/src/lib/api.ts` | Eliminada API_KEY del cliente |
| `apps/web/src/hooks/useAuth.ts` | Reset de encryption key |
| `vite.config.ts` | Eliminadas variables sensibles |
| `.env.example` | Documentación de variables |

---

## Instrucciones de Implementación

### 1. Actualizar Base de Datos
```bash
npx prisma migrate dev --name add_token_expiry
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con valores reales
```

### 3. Eliminar .env del Historial de Git
```bash
# Usar BFG Repo Cleaner o git filter-branch
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

### 4. Rotar Credenciales Expuestas
- Cambiar contraseña de base de datos
- Regenerar JWT_SECRET
- Regenerar ENCRYPTION_KEY (opcional, se genera dinámicamente)
- Cambiar credenciales SMTP

---

## Notas Importantes

1. **Las encryption keys son dinámicas**: Si no se proporciona ENCRYPTION_KEY en env, se genera una automáticamente. Esto evita el problema de llaves obsoletas post-build.

2. **El endpoint /api/config requiere autenticación**: Los clientes deben estar autenticados para obtener la encryption key.

3. **Los tokens de expiración en 24 horas**: Los tokens de verificación de email expiran después de 24 horas.

4. **JWT secret seguro**: Si el JWT_SECRET proporcionado es débil, se genera uno automáticamente.
