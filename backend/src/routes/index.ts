import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth'
import { productRoutes } from './products'
import { adminRoutes } from './admin'
import { paymentRoutes } from './payments'
import { userRoutes } from './users'
import { promoRoutes } from './promo'
import { chatRoutes } from './chats'
import { healthRoutes } from './health'
import { analyticsRoutes } from './analytics'
import { referralRoutes } from './referral'
import { reviewRoutes } from './reviews'
import { notificationRoutes } from './notifications'
import { tagsRoutes } from './tags'
import { fileRoutes } from './files'
import { marketplaceRoutes } from './marketplace'
import platformRoutes from './platform'
import billingRoutes from './billing'
import { tenantRoutes } from './tenant'
import { registerBotWebhookRoutes } from '../botWebhookHandler'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register platform routes (super admin - no tenant middleware)
  await fastify.register(platformRoutes, { prefix: '/platform' })

  // Register billing routes (tenant-scoped)
  await fastify.register(billingRoutes)

  // Register tenant info routes
  await fastify.register(tenantRoutes)

  // Register bot webhook routes (multi-tenant bots)
  await registerBotWebhookRoutes(fastify)

  // Register all other route modules
  await fastify.register(authRoutes)
  await fastify.register(productRoutes)
  await fastify.register(adminRoutes)
  await fastify.register(paymentRoutes)
  await fastify.register(userRoutes)
  await fastify.register(promoRoutes)
  await fastify.register(chatRoutes)
  await fastify.register(healthRoutes)
  await fastify.register(analyticsRoutes)
  await fastify.register(referralRoutes)
  await fastify.register(reviewRoutes)
  await fastify.register(notificationRoutes)
  await fastify.register(tagsRoutes)
  await fastify.register(fileRoutes)
  await fastify.register(marketplaceRoutes)

  console.log('All routes registered (multi-tenant enabled)')
}

export {
  authRoutes,
  productRoutes,
  adminRoutes,
  paymentRoutes,
  userRoutes,
  promoRoutes,
  chatRoutes,
  healthRoutes,
  analyticsRoutes,
  referralRoutes,
  reviewRoutes,
  notificationRoutes,
  tagsRoutes,
  fileRoutes,
  marketplaceRoutes,
  platformRoutes,
  billingRoutes,
  tenantRoutes
}
