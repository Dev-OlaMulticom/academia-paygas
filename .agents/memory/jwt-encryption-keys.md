---
name: JWT and Encryption Key Persistence
description: JWT_SECRET and ENCRYPTION_KEY must be persistent env vars; runtime-generated values break on every API server restart.
---

The API server generates random JWT_SECRET and ENCRYPTION_KEY at startup if env vars are not set. This means:
- Every restart invalidates all existing JWT tokens → 401 on all authenticated requests
- Every restart changes the AES-256-GCM encryption key → frontend's cached key is stale → 400 "Dados encriptados inválidos"

**Why:** The `_runtimeSecret = crypto.randomBytes(64).toString('hex')` pattern is convenient for dev but breaks any session that spans a server restart.

**How to apply:** Always set `JWT_SECRET` (min 32 chars) and `ENCRYPTION_KEY` (hex string) in Replit shared env vars. Currently set as persistent values in the Replit environment. Use `setEnvVars` from environment-secrets skill if they need rotation.

Test users (current passwords):
- admin@paygas.com.br / admin123 (ADMIN)
- gestor@paygas.com.br / gestor123 (GESTOR, id: d1c6677c-7856-4d4d-81db-44472a690bf1)
- atendente@paygas.com.br / atend123 (ATENDENTE, gestorId assigned)
