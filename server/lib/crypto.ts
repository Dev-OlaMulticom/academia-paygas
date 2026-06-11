import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 64
const KEY_LENGTH = 32
const ITERATIONS = 100000

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'academia-paygas-encryption-key-2026-production'

function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(SECRET_KEY, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 4) throw new Error('Formato de dados encriptados inválido')

  const salt = Buffer.from(parts[0], 'hex')
  const iv = Buffer.from(parts[1], 'hex')
  const tag = Buffer.from(parts[2], 'hex')
  const encrypted = parts[3]

  const key = deriveKey(salt)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function encryptObject(obj: Record<string, any>): string {
  return encrypt(JSON.stringify(obj))
}

export function decryptObject<T = Record<string, any>>(encryptedData: string): T {
  return JSON.parse(decrypt(encryptedData))
}

export function hashData(data: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex')
}

export function generateApiKey(): string {
  return crypto.randomBytes(48).toString('base64')
}
