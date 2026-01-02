/**
 * Billing Routes - Tenant Billing Management
 *
 * These routes allow tenants to view and manage their billing:
 * - View current plan and usage
 * - Upgrade/downgrade plan
 * - View billing history
 */

import { FastifyInstance } from 'fastify'
import {
  getTenantBillingCollection,
  BILLING_PLANS,
  BillingPlan,
  TenantBilling
} from '../database'
import { requireTenantId, requireTenant } from '../tenant'

export default async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current tenant's billing info
  fastify.get('/billing', async (request, reply) => {
    const tenantId = requireTenantId(request)

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })

      if (!billing) {
        reply.code(404)
        return { error: 'Billing record not found' }
      }

      // Calculate usage percentages
      const usagePercent = {
        products: billing.limits.productsLimit > 0
          ? Math.round((billing.usage.productsCount / billing.limits.productsLimit) * 100)
          : 0,
        orders: billing.limits.ordersPerMonth > 0
          ? Math.round((billing.usage.ordersThisMonth / billing.limits.ordersPerMonth) * 100)
          : 0,
        sellers: billing.limits.sellersLimit > 0
          ? Math.round((billing.usage.sellersCount / billing.limits.sellersLimit) * 100)
          : 0,
        admins: billing.limits.adminsLimit > 0
          ? Math.round((billing.usage.adminsCount / billing.limits.adminsLimit) * 100)
          : 0,
        storage: billing.limits.storageGB > 0
          ? Math.round((billing.usage.storageUsedMB / 1024 / billing.limits.storageGB) * 100)
          : 0
      }

      return {
        plan: billing.plan,
        status: billing.status,
        limits: billing.limits,
        usage: billing.usage,
        usagePercent,
        subscription: billing.subscription,
        features: {
          customDomain: billing.limits.customDomain,
          whiteLabel: billing.limits.whiteLabel,
          apiAccess: billing.limits.apiAccess,
          prioritySupport: billing.limits.prioritySupport
        }
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch billing info' }
    }
  })

  // Get available plans for upgrade
  fastify.get('/billing/plans', async (request, reply) => {
    const tenantId = requireTenantId(request)

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })
      const currentPlan = billing?.plan || 'free'

      const plans = Object.entries(BILLING_PLANS).map(([key, value]) => ({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        limits: value.limits,
        priceRUB: value.priceRUB,
        priceUSD: value.priceUSD,
        isCurrent: key === currentPlan,
        isUpgrade: getPlanRank(key as BillingPlan) > getPlanRank(currentPlan as BillingPlan),
        isDowngrade: getPlanRank(key as BillingPlan) < getPlanRank(currentPlan as BillingPlan)
      }))

      return { plans, currentPlan }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch plans' }
    }
  })

  // Request plan change (upgrade or downgrade)
  fastify.post('/billing/change-plan', async (request, reply) => {
    const tenantId = requireTenantId(request)
    const { plan } = request.body as { plan: BillingPlan }

    if (!plan || !BILLING_PLANS[plan]) {
      reply.code(400)
      return { error: 'Invalid plan' }
    }

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })

      if (!billing) {
        reply.code(404)
        return { error: 'Billing record not found' }
      }

      if (billing.plan === plan) {
        reply.code(400)
        return { error: 'Already on this plan' }
      }

      const now = new Date().toISOString()
      const isUpgrade = getPlanRank(plan) > getPlanRank(billing.plan)
      const newLimits = BILLING_PLANS[plan].limits

      // Check if downgrading would exceed new limits
      if (!isUpgrade) {
        const violations = []
        if (newLimits.productsLimit !== -1 && billing.usage.productsCount > newLimits.productsLimit) {
          violations.push(`products (${billing.usage.productsCount}/${newLimits.productsLimit})`)
        }
        if (newLimits.sellersLimit !== -1 && billing.usage.sellersCount > newLimits.sellersLimit) {
          violations.push(`sellers (${billing.usage.sellersCount}/${newLimits.sellersLimit})`)
        }
        if (newLimits.adminsLimit !== -1 && billing.usage.adminsCount > newLimits.adminsLimit) {
          violations.push(`admins (${billing.usage.adminsCount}/${newLimits.adminsLimit})`)
        }

        if (violations.length > 0) {
          reply.code(400)
          return {
            error: 'Cannot downgrade - current usage exceeds new plan limits',
            violations
          }
        }
      }

      // For paid plans, create payment request
      if (BILLING_PLANS[plan].priceRUB > 0 && isUpgrade) {
        // Return payment URL/details for the upgrade
        return {
          success: false,
          requiresPayment: true,
          plan,
          price: BILLING_PLANS[plan].priceRUB,
          currency: 'RUB',
          message: 'Plan upgrade requires payment. Complete payment to activate.'
        }
      }

      // For free plan or downgrades, apply immediately
      await getTenantBillingCollection().updateOne(
        { tenantId },
        {
          $set: {
            plan,
            limits: newLimits,
            'subscription.pricePerMonth': BILLING_PLANS[plan].priceRUB,
            updatedAt: now
          },
          $push: {
            billingHistory: {
              id: `evt_${isUpgrade ? 'upgrade' : 'downgrade'}_${Date.now()}`,
              type: isUpgrade ? 'upgrade' : 'downgrade',
              description: `Plan changed from ${billing.plan} to ${plan}`,
              timestamp: now,
              metadata: { oldPlan: billing.plan, newPlan: plan }
            }
          }
        }
      )

      request.log.info({ tenantId, oldPlan: billing.plan, newPlan: plan }, 'Plan changed')

      return {
        success: true,
        plan,
        limits: newLimits,
        message: `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${plan} plan`
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to change plan' }
    }
  })

  // Get billing history
  fastify.get('/billing/history', async (request, reply) => {
    const tenantId = requireTenantId(request)
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number }

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })

      if (!billing) {
        reply.code(404)
        return { error: 'Billing record not found' }
      }

      const history = (billing.billingHistory || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(offset, offset + limit)

      return {
        history,
        total: billing.billingHistory?.length || 0
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to fetch billing history' }
    }
  })

  // Check if specific action is allowed by billing limits
  fastify.get('/billing/can/:action', async (request, reply) => {
    const tenantId = requireTenantId(request)
    const { action } = request.params as { action: 'add-product' | 'add-seller' | 'add-admin' | 'create-order' }

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })

      if (!billing) {
        reply.code(404)
        return { error: 'Billing record not found' }
      }

      let allowed = true
      let reason = ''
      let current = 0
      let limit = 0

      switch (action) {
        case 'add-product':
          current = billing.usage.productsCount
          limit = billing.limits.productsLimit
          allowed = limit === -1 || current < limit
          reason = allowed ? '' : 'Product limit reached'
          break
        case 'add-seller':
          current = billing.usage.sellersCount
          limit = billing.limits.sellersLimit
          allowed = limit === -1 || current < limit
          reason = allowed ? '' : 'Seller limit reached'
          break
        case 'add-admin':
          current = billing.usage.adminsCount
          limit = billing.limits.adminsLimit
          allowed = limit === -1 || current < limit
          reason = allowed ? '' : 'Admin limit reached'
          break
        case 'create-order':
          current = billing.usage.ordersThisMonth
          limit = billing.limits.ordersPerMonth
          allowed = limit === -1 || current < limit
          reason = allowed ? '' : 'Monthly order limit reached'
          break
        default:
          reply.code(400)
          return { error: 'Invalid action' }
      }

      return {
        allowed,
        action,
        current,
        limit: limit === -1 ? 'unlimited' : limit,
        reason,
        suggestUpgrade: !allowed
      }
    } catch (error: any) {
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to check billing limits' }
    }
  })

  fastify.log.info('Billing routes registered')
}

// Helper to rank plans for comparison
function getPlanRank(plan: BillingPlan): number {
  const ranks: Record<BillingPlan, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    enterprise: 3
  }
  return ranks[plan] ?? 0
}
