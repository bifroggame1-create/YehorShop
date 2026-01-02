import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

// Get encryption key from environment
function getKey(): Buffer {
  const secret = process.env.DELIVERY_SECRET
  if (!secret) {
    throw new Error('DELIVERY_SECRET environment variable is required')
  }
  // Derive 32-byte key from secret using SHA-256
  return crypto.createHash('sha256').update(secret).digest()
}

// Encrypted data structure stored in MongoDB
export interface EncryptedData {
  iv: string      // base64
  content: string // base64
  tag: string     // base64
}

/**
 * Encrypt sensitive delivery data
 * @param plaintext - The delivery data to encrypt (keys, passwords, etc.)
 * @returns Encrypted object ready for MongoDB storage
 */
export function encryptDeliveryData(plaintext: string): EncryptedData {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const tag = cipher.getAuthTag()

  return {
    iv: iv.toString('base64'),
    content: encrypted,
    tag: tag.toString('base64')
  }
}

/**
 * Decrypt delivery data
 * @param encrypted - The encrypted object from MongoDB
 * @returns Decrypted plaintext
 */
export function decryptDeliveryData(encrypted: EncryptedData): string {
  const key = getKey()
  const iv = Buffer.from(encrypted.iv, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted.content, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if data is encrypted (has proper structure)
 */
export function isEncrypted(data: any): data is EncryptedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.iv === 'string' &&
    typeof data.content === 'string' &&
    typeof data.tag === 'string'
  )
}

/**
 * Safely decrypt - returns null if decryption fails or data is not encrypted
 */
export function safeDecrypt(data: any): string | null {
  if (!isEncrypted(data)) {
    // Data is plaintext (legacy) - return as-is
    if (typeof data === 'string') {
      return data
    }
    return null
  }

  try {
    return decryptDeliveryData(data)
  } catch (error) {
    console.error('[DeliveryCrypto] Decryption failed:', error)
    return null
  }
}

console.log('[DeliveryCrypto] Module loaded')
