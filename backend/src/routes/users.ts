import { FastifyInstance, FastifyRequest } from 'fastify'
import { validateBody, createUserSchema } from '../validation'
import { upsertUser, getUserById } from '../dataStore'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}

// Generate referral code from user ID
function generateReferralCode(userId: string): string {
  return `ref_${userId}`
}

export async function userRoutes(fastify: FastifyInstance) {
  // Get user by ID
  fastify.get('/users/:id', async (request) => {
    const { id } = request.params as any
    const user = await getUserById(id)
    return user || { error: 'User not found' }
  })

  // Create or update user
  fastify.post('/users', async (request) => {
    try {
      const data = validateBody(createUserSchema, request.body)

      // Check if user exists to preserve existing data
      const existingUser = await getUserById(data.id)

      const user = await upsertUser({
        tenantId: reqTenantId(request),
        id: data.id,
        name: data.name,
        username: data.username,
        avatar: data.avatar,
        referredBy: data.referredBy,
        referralCode: existingUser?.referralCode || generateReferralCode(data.id),
        referralCount: existingUser?.referralCount || 0,
        bonusBalance: existingUser?.bonusBalance || 0,
        createdAt: existingUser?.createdAt || new Date().toISOString()
      })

      return { success: true, user }
    } catch (error: any) {
      return {
        success: false,
        error: error.error || error.message,
        details: error.details
      }
    }
  })
}
