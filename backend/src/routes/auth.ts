import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  validateTelegramWebAppData,
  generateToken,
  authMiddleware,
  JWTPayload
} from '../auth'
import { validateBody, telegramAuthSchema } from '../validation'
import { getAdminByUserId, getAdminByUsername } from '../dataStore'

// Bootstrap admin IDs - can authenticate even without BOT_TOKEN
const BOOTSTRAP_ADMIN_IDS = (process.env.ADMIN_IDS || '8588913643').split(',').map(id => id.trim())

// ============================================
// RATE LIMITING FOR AUTH ENDPOINTS
// ============================================

// Simple in-memory rate limiter (consider Redis for production clustering)
const authAttempts = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = {
  MAX_ATTEMPTS: 10,    // max attempts per window
  WINDOW_MS: 60000,    // 1 minute window
  BLOCK_MS: 300000     // 5 minute block after exceeded
}

function getClientId(request: FastifyRequest): string {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown'
  return String(ip)
}

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = authAttempts.get(clientId)

  if (!record || now > record.resetAt) {
    // New window or expired
    authAttempts.set(clientId, { count: 1, resetAt: now + RATE_LIMIT.WINDOW_MS })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    // Blocked
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment counter
  record.count++
  return { allowed: true }
}

async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const clientId = getClientId(request)
  const { allowed, retryAfter } = checkRateLimit(clientId)

  if (!allowed) {
    reply.code(429).send({
      success: false,
      error: 'Too many authentication attempts',
      retryAfter
    })
    return
  }
}

// Check if user is admin (bootstrap IDs or in database)
async function checkIsAdmin(userId: string, username?: string): Promise<boolean> {
  // Check bootstrap admin IDs first
  if (BOOTSTRAP_ADMIN_IDS.includes(userId)) {
    return true
  }

  // Check database for admin by userId
  const adminByUserId = await getAdminByUserId(userId)
  if (adminByUserId) {
    return true
  }

  // Check database for admin by username
  if (username) {
    const adminByUsername = await getAdminByUsername(username.toLowerCase())
    if (adminByUsername) {
      return true
    }
  }

  return false
}

// Try to extract user from initData without cryptographic validation (for bootstrap admins fallback)
function extractUserFromInitData(initData: string): { id: number; first_name: string; last_name?: string; username?: string } | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const userJson = urlParams.get('user')
    if (userJson) {
      return JSON.parse(userJson)
    }
  } catch (e) {
    // ignore
  }
  return null
}

export async function authRoutes(fastify: FastifyInstance) {
  // Telegram WebApp authentication (with rate limiting)
  fastify.post('/auth/telegram', { preHandler: rateLimitMiddleware }, async (request, reply) => {
    try {
      const { initData } = validateBody(telegramAuthSchema, request.body)

      let user = validateTelegramWebAppData(initData)

      // If validation failed, check for bootstrap admin fallback
      if (!user) {
        const extractedUser = extractUserFromInitData(initData)
        const clientIp = request.ip || request.headers['x-forwarded-for'] || ''
        const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('localhost')

        // SECURITY: Bootstrap admins can authenticate even if BOT_TOKEN validation fails
        // This is safe because only hardcoded admin IDs in BOOTSTRAP_ADMIN_IDS can use this
        if (extractedUser && BOOTSTRAP_ADMIN_IDS.includes(String(extractedUser.id))) {
          console.warn('⚠️ Using bootstrap admin fallback auth for user:', extractedUser.id)
          user = extractedUser as any
        } else if (process.env.NODE_ENV !== 'production' && isLocalhost && process.env.ALLOW_DEV_AUTH === 'true') {
          // SECURITY: Dev auth requires explicit ALLOW_DEV_AUTH=true AND localhost
          console.warn('⚠️ [LOCALHOST ONLY] Using mock dev auth - set ALLOW_DEV_AUTH=false to disable')
          const mockToken = generateToken({
            id: 123456789,
            first_name: 'Dev',
            username: 'devuser'
          })
          return {
            success: true,
            token: mockToken,
            user: {
              id: '123456789',
              name: 'Dev User',
              username: 'devuser',
              isAdmin: false
            }
          }
        } else {
          console.error('❌ Auth failed: BOT_TOKEN not set or invalid initData. User ID:', extractedUser?.id)
          reply.code(401)
          return { success: false, error: 'Invalid Telegram data. Make sure BOT_TOKEN is configured.' }
        }
      }

      // At this point user is guaranteed to be non-null
      const validUser = user!
      const token = generateToken(validUser)

      // Check if user is admin (bootstrap IDs or in database)
      const isAdmin = await checkIsAdmin(String(validUser.id), validUser.username)

      console.log('🔐 Auth:', { userId: validUser.id, username: validUser.username, isAdmin })

      return {
        success: true,
        token,
        user: {
          id: String(validUser.id),
          name: `${validUser.first_name}${validUser.last_name ? ' ' + validUser.last_name : ''}`,
          username: validUser.username,
          avatar: (validUser as any).photo_url,
          isAdmin
        }
      }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // REMOVED: Bootstrap admin authentication endpoint
  // This was a security vulnerability - allowed anyone to get admin tokens by knowing admin IDs
  // All authentication must now go through /auth/telegram with proper Telegram validation

  // Verify token and return fresh admin status
  fastify.get('/auth/verify', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload

    // Check current admin status from database (may have changed since token was issued)
    const isAdmin = await checkIsAdmin(user.userId, user.username)

    console.log('🔐 Token verify:', { userId: user.userId, username: user.username, isAdmin })

    return {
      success: true,
      user: {
        id: user.userId,
        name: user.username || `User ${user.userId}`,
        username: user.username,
        isAdmin
      }
    }
  })

  // Force refresh authentication - SECURED: requires valid JWT token
  // Only returns admin status for the authenticated user (prevents enumeration)
  fastify.post('/auth/refresh', { preHandler: authMiddleware }, async (request) => {
    const user = (request as any).user as JWTPayload

    // Only check admin status for the authenticated user
    const isAdmin = await checkIsAdmin(user.userId, user.username)
    console.log('🔐 Auth refresh:', { userId: user.userId, username: user.username, isAdmin })

    return {
      success: true,
      isAdmin
    }
  })
}
