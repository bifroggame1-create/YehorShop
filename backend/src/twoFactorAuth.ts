import crypto from 'crypto'
import { getAdminsCollection } from './database'
import { ObjectId } from 'mongodb'

// TOTP implementation (RFC 6238)
const TOTP_DIGITS = 6
const TOTP_PERIOD = 30
const TOTP_ALGORITHM = 'sha1'

// Generate base32-encoded secret
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20)
  return base32Encode(buffer)
}

// Base32 encoding (RFC 4648)
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }

  return result
}

// Base32 decoding
function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  str = str.toUpperCase().replace(/[^A-Z2-7]/g, '')

  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (let i = 0; i < str.length; i++) {
    const idx = alphabet.indexOf(str[i])
    if (idx === -1) continue

    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

// Generate TOTP code
function generateTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))

  const hmac = crypto.createHmac(TOTP_ALGORITHM, key)
  hmac.update(buffer)
  const hash = hmac.digest()

  const offset = hash[hash.length - 1] & 0x0f
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS)

  return code.toString().padStart(TOTP_DIGITS, '0')
}

// Verify TOTP code (with time window tolerance)
export function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD)

  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, counter + i)
    if (expected === code) {
      return true
    }
  }

  return false
}

// Generate QR code URL for authenticator apps
export function getTOTPAuthUrl(secret: string, accountName: string, issuer: string = 'YehorShop'): string {
  const params = new URLSearchParams({
    secret: secret,
    issuer: issuer,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS.toString(),
    period: TOTP_PERIOD.toString()
  })

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`
}

// Admin 2FA storage interface
interface Admin2FA {
  adminId: string
  secret: string
  enabled: boolean
  backupCodes: string[]
  enabledAt?: string
}

// In-memory storage (should be persisted in production)
const admin2FAStore: Map<string, Admin2FA> = new Map()

// Setup 2FA for admin
export async function setup2FA(adminId: string): Promise<{ secret: string; authUrl: string; backupCodes: string[] }> {
  const secret = generateTOTPSecret()
  const backupCodes = generateBackupCodes(8)

  // Get admin info for account name
  const admin = await getAdminsCollection().findOne({
    $or: [
      { id: adminId },
      { _id: new ObjectId(adminId) }
    ]
  })

  const accountName = admin?.username || admin?.name || adminId

  admin2FAStore.set(adminId, {
    adminId,
    secret,
    enabled: false,
    backupCodes
  })

  return {
    secret,
    authUrl: getTOTPAuthUrl(secret, accountName),
    backupCodes
  }
}

// Enable 2FA after verification
export function enable2FA(adminId: string, code: string): boolean {
  const data = admin2FAStore.get(adminId)
  if (!data) return false

  if (!verifyTOTP(data.secret, code)) {
    return false
  }

  data.enabled = true
  data.enabledAt = new Date().toISOString()
  admin2FAStore.set(adminId, data)

  return true
}

// Disable 2FA
export function disable2FA(adminId: string, code: string): boolean {
  const data = admin2FAStore.get(adminId)
  if (!data || !data.enabled) return false

  if (!verifyTOTP(data.secret, code) && !verifyBackupCode(adminId, code)) {
    return false
  }

  admin2FAStore.delete(adminId)
  return true
}

// Verify 2FA code or backup code
export function verify2FA(adminId: string, code: string): boolean {
  const data = admin2FAStore.get(adminId)
  if (!data || !data.enabled) return true // 2FA not enabled

  // Check TOTP code
  if (verifyTOTP(data.secret, code)) {
    return true
  }

  // Check backup code
  return verifyBackupCode(adminId, code)
}

// Check if 2FA is enabled
export function is2FAEnabled(adminId: string): boolean {
  const data = admin2FAStore.get(adminId)
  return data?.enabled || false
}

// Generate backup codes
function generateBackupCodes(count: number): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

// Verify and consume backup code
function verifyBackupCode(adminId: string, code: string): boolean {
  const data = admin2FAStore.get(adminId)
  if (!data) return false

  const upperCode = code.toUpperCase()
  const index = data.backupCodes.indexOf(upperCode)

  if (index === -1) return false

  // Remove used backup code
  data.backupCodes.splice(index, 1)
  admin2FAStore.set(adminId, data)

  return true
}

// Get remaining backup codes count
export function getBackupCodesCount(adminId: string): number {
  const data = admin2FAStore.get(adminId)
  return data?.backupCodes.length || 0
}

// Regenerate backup codes
export function regenerateBackupCodes(adminId: string): string[] | null {
  const data = admin2FAStore.get(adminId)
  if (!data || !data.enabled) return null

  const newCodes = generateBackupCodes(8)
  data.backupCodes = newCodes
  admin2FAStore.set(adminId, data)

  return newCodes
}

console.log('[2FA] Module loaded')
