import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const ITERATIONS = 100000
const KEY_LENGTH = 32
const SALT_LENGTH = 64

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'academia-paygas-encryption-key-2026-production'

function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(SECRET_KEY, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

function decryptSync(encryptedData: string): string {
  const combined = Buffer.from(encryptedData, 'base64')
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const data = combined.subarray(SALT_LENGTH + IV_LENGTH)

  const key = deriveKey(salt)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

function encryptSync(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])

  const combined = Buffer.concat([salt, iv, encrypted])
  return combined.toString('base64')
}

// Combined middleware for encrypted payloads
export function encryptedPayload(req: Request, res: Response, next: NextFunction) {
  // Decrypt incoming encrypted body
  if (req.body?.encrypted) {
    try {
      const decrypted = decryptSync(req.body.encrypted)
      req.body = JSON.parse(decrypted)
    } catch {
      return res.status(400).json({ error: 'Dados encriptados inválidos' })
    }
  }

  // Encrypt outgoing response if client requests it
  const originalJson = res.json.bind(res)
  res.json = function (body: any) {
    if (req.headers['x-encrypted'] === 'true' && body && typeof body === 'object') {
      try {
        const encryptedPayload = encryptSync(JSON.stringify(body))
        return originalJson({ encrypted: encryptedPayload })
      } catch {
        return originalJson(body)
      }
    }
    return originalJson(body)
  }

  next()
}
