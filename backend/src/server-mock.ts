import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../.env') })

// Import after env vars are loaded
import { connectDB, ensureDefaultTenant } from './database'
import { loadProducts, saveProducts, loadPromoCodes, savePromoCodes } from './dataStore'
import { registerRoutes } from './routes'
import { defaultProducts, defaultPromoCodes } from './data/defaults'
import { redis } from './redis'
import { loggerConfig, logger } from './logger'
import { registerSwagger } from './swagger'
import { registerWebSocket } from './websocket'
import { initExchangeRates } from './cryptoConverter'
import { initEmail } from './email'
import { registerTenantPlugin } from './tenant'

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://fast-pay-ai.vercel.app',
  'https://fast-pay-ai-rgk8.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[]

// Log environment configuration
console.log('='.repeat(60))
console.log('🚀 Yehor Shop Backend v2.0 Starting...')
console.log('='.repeat(60))
console.log('Environment:')
console.log('  PORT:', process.env.PORT || '3001')
console.log('  HOST:', process.env.HOST || '0.0.0.0')
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'not set')
console.log('  DEFAULT_TENANT_ID:', process.env.DEFAULT_TENANT_ID || 'yehorshop')
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set')
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '⚠️ Not set (caching disabled)')
console.log('  CRYPTOBOT_TOKEN:', process.env.CRYPTOBOT_TOKEN ? '✅ Set' : '❌ Not set')
console.log('  CACTUSPAY_TOKEN:', process.env.CACTUSPAY_TOKEN ? '✅ Set' : '❌ Not set')
console.log('  SMTP:', process.env.SMTP_USER ? '✅ Configured' : '⚠️ Not configured')
console.log('='.repeat(60))

// Create Fastify instance with structured logging
const fastify = Fastify({
  logger: loggerConfig,
  disableRequestLogging: false,
})

// Decorate fastify with shared data
declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
    promoCodes: any[]
  }
}

// Initialize data from MongoDB
async function initializeData() {
  let products = await loadProducts()
  if (products.length === 0) {
    console.log('📦 Seeding default products...')
    await saveProducts(defaultProducts as any)
    products = defaultProducts as any
  }
  console.log(`✅ Loaded ${products.length} products`)

  let promoCodes = await loadPromoCodes()
  if (promoCodes.length === 0) {
    console.log('🎫 Seeding default promo codes...')
    await savePromoCodes(defaultPromoCodes as any)
    promoCodes = defaultPromoCodes as any
  }
  console.log(`✅ Loaded ${promoCodes.length} promo codes`)

  return { products, promoCodes }
}

// Main start function
async function start() {
  try {
    // Connect to MongoDB
    await connectDB()

    // Ensure default tenant exists and migrate products without tenantId
    await ensureDefaultTenant()

    // Connect to Redis (optional - gracefully fails if not configured)
    await redis.connect()

    // Initialize exchange rates with auto-update
    await initExchangeRates()

    // Initialize email (optional - works without configuration)
    await initEmail()

    // Load data
    const { products, promoCodes } = await initializeData()

    // Decorate fastify with data
    fastify.decorate('products', products)
    fastify.decorate('promoCodes', promoCodes)

    // Register rate limiting
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip || 'unknown',
      errorResponseBuilder: (request, context) => ({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: context.after
      })
    })

    // CORS configuration
    await fastify.register(cors, {
      origin: (origin, cb) => {
        if (!origin) {
          cb(null, true)
          return
        }
        // Only allow Yehor Shop Vercel deployments (not all .vercel.app domains)
        const isYehorShopVercel = /^https:\/\/yehor-shop(-[a-z0-9]+)?\.vercel\.app$/.test(origin)
        if (ALLOWED_ORIGINS.includes(origin) || isYehorShopVercel) {
          cb(null, true)
          return
        }
        cb(new Error('Not allowed by CORS'), false)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Id', 'X-Tenant-ID', 'X-User-ID']
    })

    // Security headers
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://pay.crypt.bot", "https://lk.cactuspay.pro", ...ALLOWED_ORIGINS],
          frameSrc: ["'self'", "https://telegram.org"],
          frameAncestors: ["'self'", "https://web.telegram.org", "https://t.me"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })

    // Register Swagger documentation
    await registerSwagger(fastify)

    // Register WebSocket for real-time chat
    await registerWebSocket(fastify)

    // Register tenant middleware for multi-tenant support
    await registerTenantPlugin(fastify)

    // Register all routes
    await registerRoutes(fastify)

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10)
    const host = process.env.HOST || '0.0.0.0'

    await fastify.listen({ port, host })
    console.log(`🚀 Server running at http://${host}:${port}`)
    console.log(`📚 API docs available at http://${host}:${port}/docs`)

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()
