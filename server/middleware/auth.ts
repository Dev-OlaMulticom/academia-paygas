import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { defineAbility } from '../auth/casl/defineAbility'

const JWT_SECRET_FALLBACK_FILE = '.jwt-secret'

function getJWTSecret(): string {
  const envSecret = process.env.JWT_SECRET

  if (envSecret && envSecret.length >= 32) {
    return envSecret
  }

  if (envSecret && envSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET is shorter than 32 characters. Using it anyway but consider generating a longer one.')
    return envSecret
  }

  // Try to load persisted secret from file
  try {
    const fs = require('fs')
    if (fs.existsSync(JWT_SECRET_FALLBACK_FILE)) {
      const persisted = fs.readFileSync(JWT_SECRET_FALLBACK_FILE, 'utf8').trim()
      if (persisted && persisted.length >= 16) {
        return persisted
      }
    }
  } catch { /* */ }

  // Generate new secret and persist it
  const newSecret = crypto.randomBytes(64).toString('hex')
  try {
    const fs = require('fs')
    fs.writeFileSync(JWT_SECRET_FALLBACK_FILE, newSecret, { mode: 0o600 })
    console.log('🔑 JWT secret generated and persisted to .jwt-secret')
  } catch {
    console.warn('⚠️  Could not persist JWT secret. Tokens will be invalidated on restart.')
  }

  return newSecret
}

const JWT_SECRET = getJWTSecret()
if (!process.env.JWT_SECRET) {
  console.log('🔑 Generated dynamic JWT secret for this session')
}

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

/**
 * authorize() — role-based or CASL ability-based authorization.
 *
 * Supports two usage patterns:
 *
 * 1. Role-based (backward compatible):
 *    authorize('ADMIN', 'GESTOR')
 *    → checks if user.role is in the allowed roles
 *
 * 2. CASL ability-based (new):
 *    authorize('update', 'User')
 *    → checks if user can perform 'update' on 'User'
 *
 * 3. CASL with conditions:
 *    authorize('update', 'User', { gestorId: req.userId })
 *    → checks with additional conditions
 */
export function authorize(...args: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !req.userId) {
      return res.status(403).json({ error: 'Sem permissão' })
    }

    // Detect pattern: if first arg is a known CASL action → ability check
    const knownActions = ['create', 'read', 'update', 'delete', 'manage', 'assignRole', 'sendNotification', 'approveCertificate', 'issueCertificate', 'viewTeam', 'exportData', 'deleteActivityLog', 'deleteNotification', 'deleteXPConfig']
    const isAbilityCheck = args.length >= 2 && knownActions.includes(args[0])

    if (isAbilityCheck) {
      // CASL ability-based authorization
      const action = args[0]
      const subject = args[1]
      const conditions = args[2] ? JSON.parse(args[2]) : undefined

      const ability = defineAbility({
        id: req.userId,
        role: req.userRole,
        gestorId: (req as any).userGestorId,
      })

      const permitted = conditions
        ? ability.can(action, subject, conditions)
        : ability.can(action, subject)

      if (!permitted) {
        return res.status(403).json({
          error: 'Sem permissão',
          required: { action, subject, conditions },
          role: req.userRole,
        })
      }

      // Attach ability to request for downstream use
      ;(req as any).ability = ability
      next()
    } else {
      // Role-based authorization (backward compatible)
      if (!args.includes(req.userRole)) {
        return res.status(403).json({ error: 'Sem permissão' })
      }
      next()
    }
  }
}

export { JWT_SECRET }
