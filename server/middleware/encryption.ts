import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const ITERATIONS = 100000
const KEY_LENGTH = 32
const SALT_LENGTH = 64
const AUTH_TAG_LENGTH = 16

// Dynamic encryption key - generated at runtime if not provided
let DYNAMIC_ENCRYPTION_KEY: string

function getEncryptionKey(): string {
  if (!DYNAMIC_ENCRYPTION_KEY) {
    // Use env var if provided, otherwise generate a random key
    if (process.env.ENCRYPTION_KEY) {
      DYNAMIC_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    } else {
      // Generate a random key for this server instance
      DYNAMIC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
      console.log('🔑 Generated dynamic encryption key for this session')
    }
  }
  return DYNAMIC_ENCRYPTION_KEY
}

// Export getter for auth route to provide to authenticated clients
export function getServerEncryptionKey(): string {
  return getEncryptionKey()
}

function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(getEncryptionKey(), salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

function decryptSync(encryptedData: string): string {
  const combined = Buffer.from(encryptedData, 'base64')
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const dataWithTag = combined.subarray(SALT_LENGTH + IV_LENGTH)
  const data = dataWithTag.subarray(0, dataWithTag.length - AUTH_TAG_LENGTH)
  const authTag = dataWithTag.subarray(dataWithTag.length - AUTH_TAG_LENGTH)

  const key = deriveKey(salt)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

function encryptSync(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  const combined = Buffer.concat([salt, iv, encrypted, authTag])
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
  } else if (req.path?.includes('/auth/login') && req.body) {
    // Diagnostic: verify body is intact for login
    const hasFields = !!(req.body.email && req.body.password)
    if (!hasFields) {
      console.warn('[ENCRYPTION MW] Login body missing email/password:', JSON.stringify(Object.keys(req.body)))
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
