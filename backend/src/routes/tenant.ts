/**
 * Tenant Routes - Public tenant information
 */

import { FastifyInstance } from 'fastify'
import { requireTenant, requireTenantId } from '../tenant'
import { getTenantBillingCollection } from '../database'

export async function tenantRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current tenant info (branding, settings)
  fastify.get('/tenant/info', async (request, reply) => {
    try {
      const tenant = requireTenant(request)

      // Return public tenant info (no sensitive data)
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        branding: tenant.branding,
        settings: {
          currency: tenant.settings?.currency || 'RUB',
          language: tenant.settings?.language || 'ru',
          enableReferrals: tenant.settings?.enableReferrals ?? true,
          referralBonusAmount: tenant.settings?.referralBonusAmount || 100,
          enableReviews: tenant.settings?.enableReviews ?? true,
          enableChat: tenant.settings?.enableChat ?? true
        },
        botUsername: tenant.botUsername,
        webAppUrl: tenant.webAppUrl,
        supportTelegram: tenant.supportTelegram
      }
    } catch (error: any) {
      // If no tenant context, return default info
      if (error.message?.includes('Tenant context required')) {
        return {
          id: 'yehorshop',
          slug: 'yehorshop',
          name: 'Yehor Shop',
          status: 'active',
          branding: {
            shopName: 'Yehor Shop',
            primaryColor: '#3B82F6',
            accentColor: '#10B981'
          },
          settings: {
            currency: 'RUB',
            language: 'ru',
            enableReferrals: true,
            referralBonusAmount: 100,
            enableReviews: true,
            enableChat: true
          }
        }
      }
      request.log.error(error)
      reply.code(500)
      return { error: 'Failed to get tenant info' }
    }
  })

  // Get tenant features (what's enabled based on billing plan)
  fastify.get('/tenant/features', async (request, reply) => {
    const tenantId = requireTenantId(request)

    try {
      const billing = await getTenantBillingCollection().findOne({ tenantId })

      if (!billing) {
        return {
          plan: 'free',
          features: {
            customDomain: false,
            whiteLabel: false,
            apiAccess: false,
            prioritySupport: false
          }
        }
      }

      return {
        plan: billing.plan,
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
      return { error: 'Failed to get tenant features' }
    }
  })

  fastify.log.info('Tenant info routes registered')
}
