import { FastifyInstance, FastifyRequest } from 'fastify'
import { getUsersCollection, getReferralsCollection, Referral } from '../database'
import { logger } from '../logger'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}

// Referral bonus amount in rubles
const REFERRAL_BONUS = parseInt(process.env.REFERRAL_BONUS || '100', 10)

// Generate referral code from user ID
function generateReferralCode(userId: string): string {
  return `ref_${userId}`
}

export async function referralRoutes(fastify: FastifyInstance) {
  // Track a new referral
  fastify.post('/referral/track', async (request, reply) => {
    const users = getUsersCollection()
    const referrals = getReferralsCollection()

    try {
      const { userId, referrerId } = request.body as { userId: string; referrerId: string }

      if (!userId || !referrerId) {
        reply.code(400)
        return { success: false, error: 'userId and referrerId are required' }
      }

      // Can't refer yourself
      if (userId === referrerId) {
        return { success: false, error: 'Cannot refer yourself', bonusAwarded: 0 }
      }

      // Check if already referred
      const existingReferral = await referrals.findOne({ userId })
      if (existingReferral) {
        return { success: false, error: 'User already referred', bonusAwarded: 0 }
      }

      // Check if referrer exists
      const referrer = await users.findOne({ id: referrerId })
      if (!referrer) {
        return { success: false, error: 'Referrer not found', bonusAwarded: 0 }
      }

      // Create referral record
      const referral: Referral = {
        tenantId: reqTenantId(request),
        userId,
        referrerId,
        bonusAwarded: REFERRAL_BONUS,
        createdAt: new Date().toISOString()
      }

      await referrals.insertOne(referral)

      // Update referrer's stats
      await users.updateOne(
        { id: referrerId },
        {
          $inc: {
            referralCount: 1,
            bonusBalance: REFERRAL_BONUS
          }
        }
      )

      // Update referred user
      await users.updateOne(
        { id: userId },
        {
          $set: { referredBy: referrerId }
        }
      )

      logger.info({
        userId,
        referrerId,
        bonus: REFERRAL_BONUS
      }, 'Referral tracked successfully')

      return {
        success: true,
        bonusAwarded: REFERRAL_BONUS,
        message: `Referral tracked! Referrer received ${REFERRAL_BONUS}₽ bonus`
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to track referral')

      // Handle duplicate key error
      if (error.code === 11000) {
        return { success: false, error: 'User already referred', bonusAwarded: 0 }
      }

      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get referral stats for a user
  fastify.get('/referral/stats/:userId', async (request, reply) => {
    const users = getUsersCollection()
    const referrals = getReferralsCollection()

    try {
      const { userId } = request.params as { userId: string }

      const user = await users.findOne({ id: userId })

      if (!user) {
        reply.code(404)
        return { success: false, error: 'User not found' }
      }

      // Generate referral code if not exists
      let referralCode = user.referralCode
      if (!referralCode) {
        referralCode = generateReferralCode(userId)
        await users.updateOne(
          { id: userId },
          { $set: { referralCode } }
        )
      }

      // Get referral count
      const referralCount = await referrals.countDocuments({ referrerId: userId })

      return {
        success: true,
        stats: {
          referralCode,
          referralCount: user.referralCount || referralCount,
          bonusBalance: user.bonusBalance || 0,
          referralLink: `https://t.me/${process.env.BOT_USERNAME || 'your_bot'}?startapp=${referralCode}`
        }
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get referral stats')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get list of referred users
  fastify.get('/referral/list/:userId', async (request, reply) => {
    const users = getUsersCollection()
    const referrals = getReferralsCollection()

    try {
      const { userId } = request.params as { userId: string }

      // Get all referrals for this user
      const referralList = await referrals
        .find({ referrerId: userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      // Get referred user details
      const referredUserIds = referralList.map(r => r.userId)
      const referredUsers = await users
        .find({ id: { $in: referredUserIds } })
        .toArray()

      const userMap = new Map(referredUsers.map(u => [u.id, u]))

      const result = referralList.map(r => ({
        id: r.userId,
        name: userMap.get(r.userId)?.name || 'Unknown',
        username: userMap.get(r.userId)?.username,
        avatar: userMap.get(r.userId)?.avatar,
        bonusAwarded: r.bonusAwarded,
        joinedAt: r.createdAt
      }))

      return {
        success: true,
        referrals: result,
        total: result.length
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get referral list')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Use bonus balance (for checkout)
  fastify.post('/referral/use-bonus', async (request, reply) => {
    const users = getUsersCollection()

    try {
      const { userId, amount } = request.body as { userId: string; amount: number }

      if (!userId || !amount || amount <= 0) {
        reply.code(400)
        return { success: false, error: 'userId and positive amount are required' }
      }

      const user = await users.findOne({ id: userId })

      if (!user) {
        reply.code(404)
        return { success: false, error: 'User not found' }
      }

      const currentBalance = user.bonusBalance || 0

      if (currentBalance < amount) {
        reply.code(400)
        return {
          success: false,
          error: 'Insufficient bonus balance',
          available: currentBalance
        }
      }

      // Deduct bonus
      await users.updateOne(
        { id: userId },
        { $inc: { bonusBalance: -amount } }
      )

      logger.info({ userId, amount }, 'Bonus balance used')

      return {
        success: true,
        usedAmount: amount,
        remainingBalance: currentBalance - amount
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to use bonus')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}
