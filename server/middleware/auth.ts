import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Generate a secure JWT secret if not provided or if it's weak
function getJWTSecret(): string {
  const envSecret = process.env.JWT_SECRET
  
  // Check if secret exists and is strong enough (at least 32 chars, not a common pattern)
  if (envSecret && envSecret.length >= 32 && !envSecret.includes('academia-paygas')) {
    return envSecret
  }
  
  // If weak or missing, generate a random secret
  if (envSecret) {
    console.warn('⚠️  JWT_SECRET is weak. Generating a stronger secret for this session.')
  }
  
  return crypto.randomBytes(64).toString('hex')
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
