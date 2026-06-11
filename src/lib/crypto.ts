const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 16
const ITERATIONS = 100000

const SECRET_KEY = 'academia-paygas-encryption-key-2026-production'

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(64))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  )

  const encryptedArray = new Uint8Array(encrypted)
  const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(encryptedArray, salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encryptedData: string): Promise<string> {
  const decoder = new TextDecoder()
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  )

  const salt = combined.slice(0, 64)
  const iv = combined.slice(64, 64 + IV_LENGTH)
  const data = combined.slice(64 + IV_LENGTH)

  const key = await deriveKey(salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  )

  return decoder.decode(decrypted)
}

export async function encryptObject(obj: Record<string, any>): Promise<string> {
  return encrypt(JSON.stringify(obj))
}

export async function decryptObject<T = Record<string, any>>(encryptedData: string): Promise<T> {
  const decrypted = await decrypt(encryptedData)
  return JSON.parse(decrypted)
}
