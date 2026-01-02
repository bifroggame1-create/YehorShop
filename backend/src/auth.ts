import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'

// JWT secret - REQUIRED in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('❌ JWT_SECRET environment variable is required in production')
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
const JWT_EXPIRES_IN = '7d'

// Telegram Bot Token for WebApp validation
const BOT_TOKEN = process.env.BOT_TOKEN || ''

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface JWTPayload {
  userId: string
  username?: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

// Admin user IDs (should be set via environment variable)
const ADMIN_IDS = (process.env.ADMIN_IDS || '8588913643').split(',').map(id => id.trim())

/**
 * Validate Telegram WebApp initData
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string): TelegramUser | null {
  if (!BOT_TOKEN) {
    console.warn('⚠️ BOT_TOKEN not set, skipping Telegram validation')
    return null
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      console.error('No hash in initData')
      return null
    }

    // Remove hash from params for validation
    urlParams.delete('hash')

    // Sort params alphabetically and create data check string
    const dataCheckArr: string[] = []
    urlParams.sort()
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`)
    })
    const dataCheckString = dataCheckArr.join('\n')

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    // Compare hashes
    if (calculatedHash !== hash) {
      console.error('Hash mismatch in Telegram validation')
      return null
    }

    // Check auth_date (not older than 24 hours)
    const authDate = urlParams.get('auth_date')
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10)
      const now = Math.floor(Date.now() / 1000)
      if (now - authTimestamp > 86400) {
        console.error('Auth data is too old')
        return null
      }
    }

    // Parse user data
    const userJson = urlParams.get('user')
    if (!userJson) {
      console.error('No user in initData')
      return null
    }

    return JSON.parse(userJson) as TelegramUser
  } catch (error) {
    console.error('Error validating Telegram WebApp data:', error)
    return null
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: TelegramUser): string {
  const payload: JWTPayload = {
    userId: String(user.id),
    username: user.username,
    isAdmin: ADMIN_IDS.includes(String(user.id))
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Authentication middleware - validates JWT and adds user to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization)

  if (!token) {
    reply.code(401).send({ success: false, error: 'Authentication required' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    reply.code(401).send({ success: false, error: 'Invalid or expired token' })
    return
  }

  // Add user info to request
  ;(request as any).user = payload
}

/**
 * Admin middleware - checks if user is admin via JWT only
 * SECURITY: All other auth methods (headers, query params, body) have been removed
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // JWT auth only - no bypasses allowed
  const token = extractToken(request.headers.authorization)

  if (!token) {
    console.log('🔐 Admin access DENIED - no token')
    reply.code(401).send({ success: false, error: 'Admin authentication required' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    console.log('🔐 Admin access DENIED - invalid token')
    reply.code(401).send({ success: false, error: 'Invalid or expired token' })
    return
  }

  // Check if user is admin (from JWT payload or ADMIN_IDS env var)
  const isUserAdmin = payload.isAdmin || ADMIN_IDS.includes(payload.userId)

  if (!isUserAdmin) {
    console.log('🔐 Admin access DENIED - not an admin:', payload.userId)
    reply.code(403).send({ success: false, error: 'Admin privileges required' })
    return
  }

  // Add user info to request
  ;(request as any).user = { ...payload, isAdmin: true }
  console.log('🔐 Admin access granted via JWT:', payload.userId)
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization)

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      ;(request as any).user = payload
    }
  }
}

/**
 * Check if user ID is admin
 */
export function isAdmin(userId: string): boolean {
  return ADMIN_IDS.includes(userId)
}

// Log configuration on startup
console.log('🔐 Auth module initialized:', {
  jwtConfigured: true,
  botTokenConfigured: !!BOT_TOKEN,
  adminIds: ADMIN_IDS
})
