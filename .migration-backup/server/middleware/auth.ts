import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET_FALLBACK_FILE = '.jwt-secret'

function getJWTSecret(): string {
  const envSecret = process.env.JWT_SECRET
  
  if (envSecret && envSecret.length >= 32 && !envSecret.includes('academia-paygas')) {
    return envSecret
  }
  
  // Try to load persisted secret from file
  try {
    const fs = require('fs')
    if (fs.existsSync(JWT_SECRET_FALLBACK_FILE)) {
      const persisted = fs.readFileSync(JWT_SECRET_FALLBACK_FILE, 'utf8').trim()
      if (persisted && persisted.length >= 32) {
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

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Sem permissão' })
    }
    next()
  }
}

export { JWT_SECRET }
