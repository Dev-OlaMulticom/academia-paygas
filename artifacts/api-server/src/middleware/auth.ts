import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fs from 'fs'

const JWT_SECRET_FALLBACK_FILE = '.jwt-secret'

function getJWTSecret(): string {
  const envSecret = process.env.JWT_SECRET
  if (envSecret && envSecret.length >= 32 && !envSecret.includes('academia-paygas')) {
    return envSecret
  }
  try {
    if (fs.existsSync(JWT_SECRET_FALLBACK_FILE)) {
      const persisted = fs.readFileSync(JWT_SECRET_FALLBACK_FILE, 'utf8').trim()
      if (persisted && persisted.length >= 32) return persisted
    }
  } catch { /* */ }
  const newSecret = crypto.randomBytes(64).toString('hex')
  try {
    fs.writeFileSync(JWT_SECRET_FALLBACK_FILE, newSecret, { mode: 0o600 })
  } catch { /* */ }
  return newSecret
}

export const JWT_SECRET = getJWTSecret()

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
