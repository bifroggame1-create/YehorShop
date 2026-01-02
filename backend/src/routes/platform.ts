/**
 * Platform Routes - Super Admin Only
 *
 * These routes are for platform-level operations:
 * - Tenant management (create, update, suspend)
 * - Tenant billing management
 * - Super admin management
 * - Platform-wide statistics
 *
 * All routes require super admin authentication.
 */

import { FastifyInstance } from 'fastify'
import {
  getTenantsCollection,
  getSuperAdminsCollection,
  getTenantBillingCollection,
  Tenant,
  TenantStatus,
  TenantBilling,
  BillingPlan,
  BillingStatus,
  BILLING_PLANS,
  getProductsCollection,
  getOrdersCollection,
  getUsersCollection,
  getSellersCollection
} from '../database'
import { superAdminMiddleware } from '../tenant'

export default async function platformRoutes(fastify: FastifyInstance): Promise<void> {
  // All platform routes require super admin
  fastify.addHook('preHandler', superAdminMiddleware)

  // ============================================================================
  // TENANT MANAGEMENT
  // ============================================================================

  // List all tenants with billing info
  fastify.get('/tenants', async (request, reply) => {
    try {
      const tenants = await getTenantsCollection()
        .find({})
        .project({
          paymentConfig: 0,
          botToken: 0
        })
        .toArray()

      // Add stats and billing for each tenant
      const tenantsWithDetails = await Promise.all(
        tenants.map(async (tenant) => {
          const [productCount, orderCount, userCount, sellerCount, billing] = await Promise.all([
            getProductsCollection().countDocuments({ tenantId: tenant.id }),
            getOrdersCollection().countDocuments({ tenantId: tenant.id }),
            getUsersCollection().countDocuments({ tenantId: tenant.id }),
            getSellersCollection().countDocuments({ tenantId: tenant.id }),
            getTenantBillingCollection().findOne({ tenantId: tenant.id })
          ])

          return {
            ...tenant,
            stats: {
              products: productCount,
              orders: orderCount,
              users: userCount,
              sellers: sellerCount
            },
            billing: billing ? {
              plan: billing.plan,
              status: billing.status,
              limits: billing.limits,
              usage: billing.usage
            } : null
          }
        })
      )

      return { tenants: tenantsWithDetails }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch tenants' }
    }
  })

  // Get single tenant with full details
  fastify.get('/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const tenant = await getTenantsCollection().findOne(
        { id },
        { projection: { paymentConfig: 0, botToken: 0 } }
      )

      if (!tenant) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      const billing = await getTenantBillingCollection().findOne({ tenantId: id })

      return { tenant, billing }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch tenant' }
    }
  })

  // Create new tenant with billing
  fastify.post('/tenants', async (request, reply) => {
    try {
      const body = request.body as Partial<Tenant> & { plan?: BillingPlan }

      if (!body.name || !body.slug) {
        reply.code(400)
        return { error: 'Name and slug are required' }
      }

      // Check if slug is unique
      const existingTenant = await getTenantsCollection().findOne({
        $or: [{ id: body.slug }, { slug: body.slug }]
      })

      if (existingTenant) {
        reply.code(409)
        return { error: 'Tenant with this slug already exists' }
      }

      const now = new Date().toISOString()
      const plan = body.plan || 'free'

      const newTenant: Tenant = {
        id: body.slug,
        slug: body.slug,
        name: body.name,
        status: 'pending',
        branding: body.branding || {
          shopName: body.name,
          primaryColor: '#3B82F6',
          accentColor: '#10B981'
        },
        settings: body.settings || {
          currency: 'RUB',
          language: 'ru',
          timezone: 'Europe/Moscow',
          enableReferrals: true,
          referralBonusAmount: 100,
          enableReviews: true,
          enableChat: true,
          autoDeliveryEnabled: true,
          requireEmailOnCheckout: false,
          notifyAdminsOnNewOrder: true,
          notifyOnPayment: true,
          notifyOnDelivery: true
        },
        commissionRules: body.commissionRules || {
          platformFeePercent: BILLING_PLANS[plan].priceRUB > 0 ? 0 : 5,
          minimumPayout: 1000,
          payoutSchedule: 'instant',
          escrowDaysDefault: 3
        },
        paymentConfig: body.paymentConfig || { enabledMethods: ['cryptobot'] },
        botToken: body.botToken,
        botUsername: body.botUsername,
        webAppUrl: body.webAppUrl,
        ownerEmail: body.ownerEmail,
        supportTelegram: body.supportTelegram,
        createdAt: now
      }

      // Create billing record
      const billing: TenantBilling = {
        tenantId: newTenant.id,
        plan,
        status: 'active',
        limits: BILLING_PLANS[plan].limits,
        usage: {
          productsCount: 0,
          ordersThisMonth: 0,
          sellersCount: 0,
          adminsCount: 0,
          storageUsedMB: 0,
          lastUpdated: now
        },
        subscription: {
          pricePerMonth: BILLING_PLANS[plan].priceRUB,
          currency: 'RUB'
        },
        billingHistory: [{
          id: `evt_created_${Date.now()}`,
          type: 'upgrade',
          description: `Tenant created with ${plan} plan`,
          timestamp: now
        }],
        createdAt: now,
        updatedAt: now
      }

      await getTenantsCollection().insertOne(newTenant)
      await getTenantBillingCollection().insertOne(billing)

      request.log.info({ tenantId: newTenant.id, plan }, 'Tenant created')

      return {
        success: true,
        tenant: { ...newTenant, paymentConfig: undefined, botToken: undefined },
        billing: { plan: billing.plan, status: billing.status, limits: billing.limits }
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to create tenant' }
    }
  })

  // Update tenant
  fastify.put('/tenants/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as Partial<Tenant>

      // Prevent changing id/slug
      delete updates.id
      delete updates.slug
      delete (updates as any)._id

      const result = await getTenantsCollection().updateOne(
        { id },
        { $set: updates }
      )

      if (result.matchedCount === 0) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      request.log.info({ tenantId: id }, 'Tenant updated')

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to update tenant' }
    }
  })

  // Activate tenant
  fastify.post('/tenants/:id/activate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const result = await getTenantsCollection().updateOne(
        { id },
        {
          $set: {
            status: 'active' as TenantStatus,
            activatedAt: new Date().toISOString()
          },
          $unset: {
            suspendedAt: '',
            suspendReason: ''
          }
        }
      )

      if (result.matchedCount === 0) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      request.log.info({ tenantId: id }, 'Tenant activated')

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to activate tenant' }
    }
  })

  // Suspend tenant
  fastify.post('/tenants/:id/suspend', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { reason } = request.body as { reason?: string }

      const result = await getTenantsCollection().updateOne(
        { id },
        {
          $set: {
            status: 'suspended' as TenantStatus,
            suspendedAt: new Date().toISOString(),
            suspendReason: reason || 'Suspended by platform admin'
          }
        }
      )

      if (result.matchedCount === 0) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      // Also update billing status
      await getTenantBillingCollection().updateOne(
        { tenantId: id },
        { $set: { status: 'suspended' as BillingStatus } }
      )

      request.log.info({ tenantId: id, reason }, 'Tenant suspended')

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to suspend tenant' }
    }
  })

  // ============================================================================
  // BILLING MANAGEMENT
  // ============================================================================

  // Get billing plans
  fastify.get('/billing/plans', async () => {
    return { plans: BILLING_PLANS }
  })

  // Update tenant plan
  fastify.post('/tenants/:id/billing/upgrade', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { plan } = request.body as { plan: BillingPlan }

      if (!plan || !BILLING_PLANS[plan]) {
        reply.code(400)
        return { error: 'Invalid plan' }
      }

      const billing = await getTenantBillingCollection().findOne({ tenantId: id })
      if (!billing) {
        reply.code(404)
        return { error: 'Tenant billing not found' }
      }

      const now = new Date().toISOString()
      const newLimits = BILLING_PLANS[plan].limits

      await getTenantBillingCollection().updateOne(
        { tenantId: id },
        {
          $set: {
            plan,
            limits: newLimits,
            'subscription.pricePerMonth': BILLING_PLANS[plan].priceRUB,
            updatedAt: now
          },
          $push: {
            billingHistory: {
              id: `evt_upgrade_${Date.now()}`,
              type: 'upgrade',
              description: `Plan changed from ${billing.plan} to ${plan}`,
              timestamp: now,
              metadata: { oldPlan: billing.plan, newPlan: plan }
            }
          }
        }
      )

      // Update commission rules based on plan
      await getTenantsCollection().updateOne(
        { id },
        {
          $set: {
            'commissionRules.platformFeePercent': BILLING_PLANS[plan].priceRUB > 0 ? 0 : 5
          }
        }
      )

      request.log.info({ tenantId: id, plan }, 'Tenant plan upgraded')

      return { success: true, plan, limits: newLimits }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to upgrade plan' }
    }
  })

  // Get tenant billing details
  fastify.get('/tenants/:id/billing', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const billing = await getTenantBillingCollection().findOne({ tenantId: id })
      if (!billing) {
        reply.code(404)
        return { error: 'Billing not found' }
      }

      return { billing }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch billing' }
    }
  })

  // Reset monthly usage (for cron job)
  fastify.post('/billing/reset-monthly-usage', async (request, reply) => {
    try {
      const now = new Date().toISOString()

      const result = await getTenantBillingCollection().updateMany(
        {},
        {
          $set: {
            'usage.ordersThisMonth': 0,
            'usage.lastUpdated': now
          }
        }
      )

      request.log.info({ count: result.modifiedCount }, 'Monthly usage reset')

      return { success: true, tenantsUpdated: result.modifiedCount }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to reset monthly usage' }
    }
  })

  // ============================================================================
  // SUPER ADMIN MANAGEMENT
  // ============================================================================

  // List super admins
  fastify.get('/superadmins', async (request, reply) => {
    try {
      const superAdmins = await getSuperAdminsCollection().find({}).toArray()
      return { superAdmins }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch super admins' }
    }
  })

  // Add super admin
  fastify.post('/superadmins', async (request, reply) => {
    try {
      const { userId, username, name } = request.body as {
        userId: string
        username?: string
        name?: string
      }

      if (!userId) {
        reply.code(400)
        return { error: 'userId is required' }
      }

      // Check if already exists
      const existing = await getSuperAdminsCollection().findOne({ id: userId })
      if (existing) {
        reply.code(409)
        return { error: 'Super admin already exists' }
      }

      await getSuperAdminsCollection().insertOne({
        id: userId,
        username,
        name,
        permissions: ['all'],
        createdAt: new Date().toISOString()
      })

      request.log.info({ userId }, 'Super admin added')

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to add super admin' }
    }
  })

  // Remove super admin
  fastify.delete('/superadmins/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string }

      // Prevent removing last super admin
      const count = await getSuperAdminsCollection().countDocuments({})
      if (count <= 1) {
        reply.code(400)
        return { error: 'Cannot remove the last super admin' }
      }

      const result = await getSuperAdminsCollection().deleteOne({ id: userId })

      if (result.deletedCount === 0) {
        reply.code(404)
        return { error: 'Super admin not found' }
      }

      request.log.info({ userId }, 'Super admin removed')

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to remove super admin' }
    }
  })

  // ============================================================================
  // PLATFORM STATISTICS
  // ============================================================================

  fastify.get('/stats', async (request, reply) => {
    try {
      const [
        tenantCount,
        totalProducts,
        totalOrders,
        totalUsers,
        totalSellers
      ] = await Promise.all([
        getTenantsCollection().countDocuments({}),
        getProductsCollection().countDocuments({}),
        getOrdersCollection().countDocuments({}),
        getUsersCollection().countDocuments({}),
        getSellersCollection().countDocuments({})
      ])

      // Get tenants by status
      const [activeTenants, suspendedTenants, pendingTenants] = await Promise.all([
        getTenantsCollection().countDocuments({ status: 'active' }),
        getTenantsCollection().countDocuments({ status: 'suspended' }),
        getTenantsCollection().countDocuments({ status: 'pending' })
      ])

      // Get tenants by plan
      const planStats = await getTenantBillingCollection().aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ]).toArray()

      const tenantsByPlan = planStats.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {} as Record<string, number>)

      // Calculate MRR (Monthly Recurring Revenue)
      const mrrResult = await getTenantBillingCollection().aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$subscription.pricePerMonth' } } }
      ]).toArray()

      const mrr = mrrResult[0]?.total || 0

      return {
        stats: {
          tenants: {
            total: tenantCount,
            active: activeTenants,
            suspended: suspendedTenants,
            pending: pendingTenants,
            byPlan: tenantsByPlan
          },
          totals: {
            products: totalProducts,
            orders: totalOrders,
            users: totalUsers,
            sellers: totalSellers
          },
          revenue: {
            mrr,
            currency: 'RUB'
          }
        }
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch platform stats' }
    }
  })

  fastify.log.info('Platform routes registered')
}
