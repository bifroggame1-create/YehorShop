import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import {
  Tenant,
  getTenantBySlug,
  getTenantById,
  getTenantByBotToken,
  getSuperAdminsCollection,
  checkTenantLimits
} from './database'

// ============================================================================
// TENANT CONTEXT
// ============================================================================

// Extend Fastify request to include tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: Tenant
    tenantId?: string
    isSuperAdmin?: boolean
  }
}

// ============================================================================
// TENANT RESOLUTION STRATEGIES
// ============================================================================

type TenantResolutionStrategy = 'header' | 'query' | 'botToken' | 'startParam' | 'subdomain'

interface TenantResolutionResult {
  tenant: Tenant | null
  strategy: TenantResolutionStrategy | null
  error?: string
}

/**
 * Resolve tenant from request using multiple strategies in priority order:
 * 1. Bot token (for webhook handlers)
 * 2. X-Tenant-ID header (for API calls)
 * 3. Query parameter ?tenant=slug
 * 4. Telegram Mini App start parameter
 * 5. Default tenant fallback (development)
 */
async function resolveTenant(request: FastifyRequest): Promise<TenantResolutionResult> {
  // Strategy 1: Bot token from webhook path or header
  const botToken = request.headers['x-bot-token'] as string
  if (botToken) {
    const tenant = await getTenantByBotToken(botToken)
    if (tenant) {
      return { tenant, strategy: 'botToken' }
    }
  }

  // Strategy 2: X-Tenant-ID header (preferred for API calls)
  const tenantIdHeader = request.headers['x-tenant-id'] as string
  if (tenantIdHeader) {
    const tenant = await getTenantById(tenantIdHeader) || await getTenantBySlug(tenantIdHeader)
    if (tenant) {
      return { tenant, strategy: 'header' }
    }
    return { tenant: null, strategy: 'header', error: `Tenant not found: ${tenantIdHeader}` }
  }

  // Strategy 3: Query parameter
  const query = request.query as Record<string, string>
  if (query.tenant) {
    const tenant = await getTenantBySlug(query.tenant)
    if (tenant) {
      return { tenant, strategy: 'query' }
    }
    return { tenant: null, strategy: 'query', error: `Tenant not found: ${query.tenant}` }
  }

  // Strategy 4: Telegram Mini App start parameter (tgWebAppStartParam)
  if (query.tgWebAppStartParam) {
    // Start param format: tenant_<slug> or just <slug>
    const startParam = query.tgWebAppStartParam
    const slug = startParam.startsWith('tenant_') ? startParam.slice(7) : startParam
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      return { tenant, strategy: 'startParam' }
    }
  }

  // Strategy 5: Default tenant fallback (for development)
  if (process.env.DEFAULT_TENANT_ID) {
    const tenant = await getTenantById(process.env.DEFAULT_TENANT_ID)
    if (tenant) {
      return { tenant, strategy: 'header' }
    }
  }

  return { tenant: null, strategy: null, error: 'No tenant identifier provided' }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Tenant middleware - resolves and validates tenant for every request
 * Injects tenant and tenantId into request context
 */
export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip tenant resolution for platform-level routes
  const platformRoutes = [
    '/health',
    '/api/health',
    '/platform/',
    '/superadmin/',
    '/billing/'
  ]

  const isplatformRoute = platformRoutes.some(route => request.url.startsWith(route))
  if (isplatformRoute) {
    return
  }

  const { tenant, strategy, error } = await resolveTenant(request)

  if (!tenant) {
    // In development, allow requests without tenant if configured
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_NO_TENANT === 'true') {
      request.log.warn({ url: request.url }, 'Request without tenant (allowed in dev)')
      return
    }

    reply.code(400).send({
      error: 'Tenant Required',
      message: error || 'Unable to determine tenant. Provide X-Tenant-ID header or tenant query parameter.',
      code: 'TENANT_REQUIRED'
    })
    return
  }

  // Check if tenant is active
  if (tenant.status !== 'active') {
    reply.code(403).send({
      error: 'Tenant Suspended',
      message: `This shop is currently ${tenant.status}`,
      code: 'TENANT_SUSPENDED'
    })
    return
  }

  // Inject tenant context into request
  request.tenant = tenant
  request.tenantId = tenant.id

  request.log.debug({ tenantId: tenant.id, strategy }, 'Tenant resolved')
}

/**
 * Super admin check middleware
 * For platform-level operations that should bypass tenant isolation
 * SECURITY: Requires valid JWT token, not just headers
 */
export async function superAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // SECURITY: Extract and verify JWT token (not just header)
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Super admin authentication required (JWT token missing)',
      code: 'SUPERADMIN_REQUIRED'
    })
    return
  }

  const token = authHeader.slice(7)

  // Import JWT verification from auth module
  let payload: { userId: string; username?: string } | null = null
  try {
    const jwt = await import('jsonwebtoken')
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured')
    }
    payload = jwt.default.verify(token, JWT_SECRET) as any
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    })
    return
  }

  if (!payload?.userId) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid token payload',
      code: 'INVALID_TOKEN'
    })
    return
  }

  // Check if user is a super admin
  const superAdmin = await getSuperAdminsCollection().findOne({ id: payload.userId })

  if (!superAdmin) {
    reply.code(403).send({
      error: 'Forbidden',
      message: 'Super admin access required',
      code: 'NOT_SUPERADMIN'
    })
    return
  }

  request.isSuperAdmin = true
}

/**
 * Billing limits middleware factory
 * Creates middleware that checks if tenant can perform specific action
 */
export function billingLimitsMiddleware(resource: 'products' | 'orders' | 'sellers' | 'admins' | 'storage') {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenantId = request.tenantId

    if (!tenantId) {
      reply.code(400).send({
        error: 'Tenant Required',
        message: 'Tenant context required for this operation',
        code: 'TENANT_REQUIRED'
      })
      return
    }

    const { allowed, current, limit } = await checkTenantLimits(tenantId, resource)

    if (!allowed) {
      reply.code(402).send({
        error: 'Limit Exceeded',
        message: `You have reached the ${resource} limit for your plan. Current: ${current}, Limit: ${limit}`,
        code: 'BILLING_LIMIT_EXCEEDED',
        resource,
        current,
        limit
      })
      return
    }
  }
}

/**
 * Tenant admin check middleware
 * Verifies user is admin for the current tenant
 */
export async function tenantAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId

  if (!tenantId) {
    reply.code(400).send({
      error: 'Tenant Required',
      message: 'Tenant context required for admin operations',
      code: 'TENANT_REQUIRED'
    })
    return
  }

  // Admin check will be done in the specific admin middleware
  // This is just a placeholder for tenant validation
}

// ============================================================================
// PLUGIN REGISTRATION
// ============================================================================

/**
 * Register tenant middleware as Fastify plugin
 */
export async function registerTenantPlugin(fastify: FastifyInstance): Promise<void> {
  // Add tenant resolution to all requests
  fastify.addHook('preHandler', tenantMiddleware)

  // Decorate request with tenant helpers
  fastify.decorateRequest('tenant', null)
  fastify.decorateRequest('tenantId', '')
  fastify.decorateRequest('isSuperAdmin', false)

  fastify.log.info('Tenant middleware registered')
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get tenant ID from request or throw error
 */
export function requireTenantId(request: FastifyRequest): string {
  if (!request.tenantId) {
    throw new Error('Tenant context required but not available')
  }
  return request.tenantId
}

/**
 * Get tenant from request or throw error
 */
export function requireTenant(request: FastifyRequest): Tenant {
  if (!request.tenant) {
    throw new Error('Tenant context required but not available')
  }
  return request.tenant
}

/**
 * Create cache key with tenant prefix
 */
export function tenantCacheKey(tenantId: string, key: string): string {
  return `tenant:${tenantId}:${key}`
}

console.log('Tenant module loaded')
