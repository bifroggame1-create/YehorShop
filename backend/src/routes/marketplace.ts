import { FastifyInstance, FastifyRequest } from 'fastify'
import { adminMiddleware } from '../auth'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import {
  openDispute,
  addDisputeMessage,
  resolveDispute,
  requestKeyReplacement,
  recalculateSellerReputation,
  runScheduledTasks,
  initializeSeller,
  releaseEscrow,
  refundEscrow
} from '../marketplace'
import {
  getDisputesCollection,
  getEscrowCollection,
  getKeyReplacementsCollection,
  getSellersCollection,
  getSellerApplicationsCollection,
  DisputeReason,
  DisputeResolution
} from '../database'
import { v4 as uuidv4 } from 'uuid'
import { logAdminAction } from '../dataStore'

export async function marketplaceRoutes(fastify: FastifyInstance) {

  // ============================================
  // PUBLIC: SELLER INFO
  // ============================================

  // Get seller public profile with reputation
  fastify.get('/sellers/:id/profile', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const seller = await getSellersCollection().findOne({ id })

      if (!seller) {
        reply.code(404)
        return { error: 'Seller not found' }
      }

      // Return public info only with safe defaults
      return {
        id: seller.id,
        name: seller.name || 'Unknown',
        avatar: seller.avatar || null,
        rating: seller.rating || 5,
        ratingCount: seller.ratingCount || 0,
        badges: (seller.badges || []).filter(b => b !== 'risky'),
        stats: {
          totalOrders: seller.stats?.totalOrders || 0,
          successfulOrders: seller.stats?.successfulOrders || 0
        },
        memberSince: seller.createdAt || new Date().toISOString(),
        isVerified: seller.isVerified || false
      }
    } catch (error: any) {
      console.error('Error fetching seller profile:', error)
      reply.code(500)
      return { error: 'Failed to load seller profile' }
    }
  })

  // ============================================
  // SELLER APPLICATIONS
  // ============================================

  // Submit seller application (public)
  fastify.post('/seller-applications', async (request, reply) => {
    try {
      const { shopName, category, description, telegram, userId, userName } = request.body as {
        shopName: string
        category: string
        description: string
        telegram: string
        userId?: string
        userName?: string
      }

      if (!shopName || !category || !description || !telegram) {
        reply.code(400)
        return { error: 'All fields are required' }
      }

      const application = {
        tenantId: reqTenantId(request),
        id: uuidv4(),
        shopName,
        category,
        description,
        telegram,
        userId,
        userName,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      }

      await getSellerApplicationsCollection().insertOne(application)

      console.log('📝 New seller application:', { shopName, telegram, category })

      return { success: true, applicationId: application.id }
    } catch (error: any) {
      console.error('Error submitting seller application:', error)
      reply.code(500)
      return { error: 'Failed to submit application' }
    }
  })

  // Get all seller applications (admin only)
  fastify.get('/admin/seller-applications', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const applications = await getSellerApplicationsCollection()
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

      return { applications }
    } catch (error: any) {
      console.error('Error fetching seller applications:', error)
      reply.code(500)
      return { error: 'Failed to fetch applications' }
    }
  })

  // Update seller application status (admin only)
  fastify.put('/admin/seller-applications/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { status, reviewNote } = request.body as { status: 'approved' | 'rejected', reviewNote?: string }
      const user = (request as any).user

      const result = await getSellerApplicationsCollection().findOneAndUpdate(
        { id },
        {
          $set: {
            status,
            reviewNote,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.username || user?.userId || 'admin'
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(404)
        return { error: 'Application not found' }
      }

      console.log('📝 Seller application updated:', { id, status, reviewedBy: user?.username })

      return { success: true, application: result }
    } catch (error: any) {
      console.error('Error updating seller application:', error)
      reply.code(500)
      return { error: 'Failed to update application' }
    }
  })

  // ============================================
  // BUYER: DISPUTES
  // ============================================

  // Open dispute for an order
  fastify.post('/disputes', async (request, reply) => {
    const { orderId, reason, description } = request.body as {
      orderId: string
      reason: DisputeReason
      description: string
    }

    // Get user from auth (would come from JWT in real impl)
    const user = (request as any).user
    if (!user?.userId) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    const result = await openDispute(
      orderId,
      user.userId,
      user.username || 'Buyer',
      reason,
      description
    )

    if ('error' in result) {
      reply.code(400)
      return result
    }

    return { success: true, dispute: result }
  })

  // Get user's disputes
  fastify.get('/disputes/my', async (request, reply) => {
    const user = (request as any).user
    if (!user?.userId) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    const disputes = await getDisputesCollection()
      .find({ buyerId: user.userId })
      .sort({ createdAt: -1 })
      .toArray()

    return { disputes }
  })

  // Get dispute by ID
  fastify.get('/disputes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user

    const dispute = await getDisputesCollection().findOne({ id })

    if (!dispute) {
      reply.code(404)
      return { error: 'Dispute not found' }
    }

    // Check if user is participant or admin
    const isParticipant = user?.userId === dispute.buyerId || user?.userId === dispute.sellerId
    const isAdmin = user?.isAdmin

    if (!isParticipant && !isAdmin) {
      reply.code(403)
      return { error: 'Access denied' }
    }

    return { dispute }
  })

  // Add message to dispute
  fastify.post('/disputes/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { content, attachments } = request.body as { content: string; attachments?: string[] }

    const user = (request as any).user
    if (!user?.userId) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    const dispute = await getDisputesCollection().findOne({ id })
    if (!dispute) {
      reply.code(404)
      return { error: 'Dispute not found' }
    }

    // Determine sender type
    let senderType: 'buyer' | 'seller' | 'admin' = 'buyer'
    if (user.userId === dispute.sellerId) senderType = 'seller'
    if (user.isAdmin) senderType = 'admin'

    const updated = await addDisputeMessage(
      id,
      user.userId,
      senderType,
      user.username || 'User',
      content,
      attachments
    )

    return { success: true, dispute: updated }
  })

  // ============================================
  // BUYER: KEY REPLACEMENT
  // ============================================

  // Request key replacement
  fastify.post('/orders/:orderId/replacement', async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const { reason } = request.body as { reason: string }

    const user = (request as any).user
    if (!user?.userId) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    const result = await requestKeyReplacement(orderId, user.userId, reason)

    if ('error' in result) {
      reply.code(400)
      return result
    }

    // Check if it's a dispute (escalated)
    if ('status' in result && result.status === 'open') {
      return { success: true, escalated: true, dispute: result }
    }

    return { success: true, replacement: result }
  })

  // ============================================
  // ADMIN: DISPUTE MANAGEMENT
  // ============================================

  // Get all disputes (admin)
  fastify.get('/admin/disputes', { preHandler: adminMiddleware }, async (request) => {
    const { status, sellerId, limit = 50, offset = 0 } = request.query as any

    const filter: any = {}
    if (status) filter.status = status
    if (sellerId) filter.sellerId = sellerId

    const [disputes, total] = await Promise.all([
      getDisputesCollection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .toArray(),
      getDisputesCollection().countDocuments(filter)
    ])

    return { disputes, total, limit: Number(limit), offset: Number(offset) }
  })

  // Resolve dispute (admin)
  fastify.post('/admin/disputes/:id/resolve', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { resolution, note } = request.body as { resolution: DisputeResolution; note: string }

    const user = (request as any).user
    const dispute = await resolveDispute(id, resolution, note, user?.userId || 'admin')

    if (!dispute) {
      reply.code(404)
      return { error: 'Dispute not found' }
    }

    // Log action
    await logAdminAction({
      adminId: user?.userId || 'admin',
      adminName: user?.username,
      action: 'dispute_resolve',
      entityType: 'dispute',
      entityId: id,
      metadata: { resolution, note }
    })

    return { success: true, dispute }
  })

  // Escalate dispute to admin review
  fastify.post('/admin/disputes/:id/escalate', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const result = await getDisputesCollection().findOneAndUpdate(
      { id },
      { $set: { status: 'admin_review', updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      reply.code(404)
      return { error: 'Dispute not found' }
    }

    return { success: true, dispute: result }
  })

  // ============================================
  // ADMIN: ESCROW MANAGEMENT
  // ============================================

  // Get escrow transactions
  fastify.get('/admin/escrow', { preHandler: adminMiddleware }, async (request) => {
    const { status, sellerId, limit = 50, offset = 0 } = request.query as any

    const filter: any = {}
    if (status) filter.status = status
    if (sellerId) filter.sellerId = sellerId

    const [transactions, total] = await Promise.all([
      getEscrowCollection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .toArray(),
      getEscrowCollection().countDocuments(filter)
    ])

    return { transactions, total }
  })

  // Force release escrow
  fastify.post('/admin/escrow/:orderId/release', { preHandler: adminMiddleware }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const user = (request as any).user

    const success = await releaseEscrow(orderId)

    if (!success) {
      reply.code(404)
      return { error: 'Escrow transaction not found or already processed' }
    }

    await logAdminAction({
      adminId: user?.userId || 'admin',
      adminName: user?.username,
      action: 'escrow_release',
      entityType: 'escrow',
      entityId: orderId
    })

    return { success: true }
  })

  // Force refund escrow
  fastify.post('/admin/escrow/:orderId/refund', { preHandler: adminMiddleware }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const user = (request as any).user

    const success = await refundEscrow(orderId)

    if (!success) {
      reply.code(404)
      return { error: 'Escrow transaction not found or already processed' }
    }

    await logAdminAction({
      adminId: user?.userId || 'admin',
      adminName: user?.username,
      action: 'escrow_refund',
      entityType: 'escrow',
      entityId: orderId
    })

    return { success: true }
  })

  // ============================================
  // ADMIN: SELLER MANAGEMENT
  // ============================================

  // Get seller with full details
  fastify.get('/admin/sellers/:id/full', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const seller = await getSellersCollection().findOne({ id })

    if (!seller) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    return { seller }
  })

  // Recalculate seller reputation
  fastify.post('/admin/sellers/:id/recalculate', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const seller = await recalculateSellerReputation(id)

    if (!seller) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    return { success: true, seller }
  })

  // Verify seller
  fastify.post('/admin/sellers/:id/verify', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user

    const result = await getSellersCollection().findOneAndUpdate(
      { id },
      {
        $set: { isVerified: true },
        $addToSet: { badges: 'verified' as const }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    await logAdminAction({
      adminId: user?.userId || 'admin',
      adminName: user?.username,
      action: 'seller_verify',
      entityType: 'seller',
      entityId: id
    })

    return { success: true, seller: result }
  })

  // Block seller
  fastify.post('/admin/sellers/:id/block', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { reason } = request.body as { reason: string }
    const user = (request as any).user

    const result = await getSellersCollection().findOneAndUpdate(
      { id },
      { $set: { isBlocked: true, blockReason: reason } },
      { returnDocument: 'after' }
    )

    if (!result) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    await logAdminAction({
      adminId: user?.userId || 'admin',
      adminName: user?.username,
      action: 'seller_block',
      entityType: 'seller',
      entityId: id,
      metadata: { reason }
    })

    return { success: true, seller: result }
  })

  // Unblock seller
  fastify.post('/admin/sellers/:id/unblock', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const result = await getSellersCollection().findOneAndUpdate(
      { id },
      { $set: { isBlocked: false }, $unset: { blockReason: 1 } },
      { returnDocument: 'after' }
    )

    if (!result) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    return { success: true, seller: result }
  })

  // Update seller escrow settings
  fastify.put('/admin/sellers/:id/settings', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { escrowDays, maxReplacementsPerOrder } = request.body as {
      escrowDays?: number
      maxReplacementsPerOrder?: number
    }

    const updates: any = {}
    if (escrowDays !== undefined) updates.escrowDays = escrowDays
    if (maxReplacementsPerOrder !== undefined) updates.maxReplacementsPerOrder = maxReplacementsPerOrder

    const result = await getSellersCollection().findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    )

    if (!result) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    return { success: true, seller: result }
  })

  // ============================================
  // ADMIN: KEY REPLACEMENTS
  // ============================================

  // Get replacement history
  fastify.get('/admin/replacements', { preHandler: adminMiddleware }, async (request) => {
    const { status, sellerId, limit = 50, offset = 0 } = request.query as any

    const filter: any = {}
    if (status) filter.status = status
    if (sellerId) filter.sellerId = sellerId

    const [replacements, total] = await Promise.all([
      getKeyReplacementsCollection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .toArray(),
      getKeyReplacementsCollection().countDocuments(filter)
    ])

    return { replacements, total }
  })

  // ============================================
  // ADMIN: SCHEDULED TASKS
  // ============================================

  // Run scheduled tasks manually
  fastify.post('/admin/marketplace/run-tasks', { preHandler: adminMiddleware }, async () => {
    const result = await runScheduledTasks()
    return { success: true, ...result }
  })

  // ============================================
  // SELLER DASHBOARD (placeholder)
  // ============================================

  // Get seller dashboard data
  fastify.get('/seller/dashboard', async (request, reply) => {
    const user = (request as any).user
    if (!user?.userId) {
      reply.code(401)
      return { error: 'Authentication required' }
    }

    // Find seller by user ID (assumes seller.id matches user.userId for own shops)
    const seller = await getSellersCollection().findOne({ id: user.userId })

    if (!seller) {
      reply.code(404)
      return { error: 'Seller not found' }
    }

    // Get pending escrow
    const pendingEscrow = await getEscrowCollection()
      .find({ sellerId: seller.id, status: 'frozen' })
      .toArray()

    // Get active disputes
    const activeDisputes = await getDisputesCollection()
      .find({ sellerId: seller.id, status: { $in: ['open', 'seller_response', 'admin_review'] } })
      .toArray()

    return {
      seller: {
        id: seller.id,
        name: seller.name,
        rating: seller.rating,
        badges: seller.badges
      },
      balance: seller.balance,
      stats: seller.stats,
      pendingEscrow: pendingEscrow.reduce((sum, e) => sum + e.amount, 0),
      pendingEscrowCount: pendingEscrow.length,
      activeDisputesCount: activeDisputes.length,
      alerts: generateSellerAlerts(seller, pendingEscrow.length, activeDisputes.length)
    }
  })
}

// Helper to generate seller alerts
function generateSellerAlerts(seller: any, pendingCount: number, disputeCount: number): string[] {
  const alerts: string[] = []

  if (seller.stats.refundsCount / seller.stats.totalOrders > 0.1) {
    alerts.push('High refund rate detected. Review your product quality.')
  }

  if (disputeCount > 0) {
    alerts.push(`You have ${disputeCount} active dispute(s) requiring attention.`)
  }

  if (seller.rating < 70) {
    alerts.push('Your rating is below average. Consider improving customer service.')
  }

  if (seller.badges.includes('risky')) {
    alerts.push('Your account is flagged for review. Maintain good practices.')
  }

  return alerts
}
