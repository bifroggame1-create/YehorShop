import { logger } from './logger'
import { getOrderStats, countUsers, loadProducts } from './dataStore'
import { redis } from './redis'
import { getActiveChatConnections } from './websocket'

// Analytics data structure
interface AnalyticsSnapshot {
  timestamp: string
  orders: {
    total: number
    pending: number
    paid: number
    delivered: number
    cancelled: number
    revenue: number
  }
  users: {
    total: number
  }
  products: {
    total: number
    inStock: number
    outOfStock: number
  }
  system: {
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    cacheEnabled: boolean
    activeWebSockets: number
  }
}

// Request tracking
interface RequestMetrics {
  totalRequests: number
  requestsPerMinute: number
  averageResponseTime: number
  errorRate: number
  statusCodes: Record<number, number>
}

let requestMetrics: RequestMetrics = {
  totalRequests: 0,
  requestsPerMinute: 0,
  averageResponseTime: 0,
  errorRate: 0,
  statusCodes: {}
}

let requestsInLastMinute: number[] = []
let responseTimes: number[] = []
const startTime = Date.now()

/**
 * Track request for metrics
 */
export function trackRequest(statusCode: number, responseTimeMs: number): void {
  requestMetrics.totalRequests++
  requestMetrics.statusCodes[statusCode] = (requestMetrics.statusCodes[statusCode] || 0) + 1

  // Track requests per minute
  const now = Date.now()
  requestsInLastMinute.push(now)
  requestsInLastMinute = requestsInLastMinute.filter(t => now - t < 60000)
  requestMetrics.requestsPerMinute = requestsInLastMinute.length

  // Track response times (keep last 100)
  responseTimes.push(responseTimeMs)
  if (responseTimes.length > 100) responseTimes.shift()
  requestMetrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length

  // Calculate error rate
  const errors = Object.entries(requestMetrics.statusCodes)
    .filter(([code]) => parseInt(code) >= 400)
    .reduce((sum, [, count]) => sum + count, 0)
  requestMetrics.errorRate = (errors / requestMetrics.totalRequests) * 100
}

/**
 * Get current request metrics
 */
export function getRequestMetrics(): RequestMetrics {
  return { ...requestMetrics }
}

/**
 * Get analytics snapshot
 */
export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  try {
    const [orderStats, userCount, products] = await Promise.all([
      getOrderStats(),
      countUsers(),
      loadProducts()
    ])

    const activeWsConnections = getActiveChatConnections()
    let totalWsConnections = 0
    activeWsConnections.forEach(count => totalWsConnections += count)

    const inStock = products.filter(p => p.inStock !== false).length
    const outOfStock = products.filter(p => p.inStock === false).length

    return {
      timestamp: new Date().toISOString(),
      orders: {
        total: orderStats.total,
        pending: orderStats.pending,
        paid: orderStats.paid,
        delivered: orderStats.delivered,
        cancelled: orderStats.cancelled,
        revenue: orderStats.totalRevenue
      },
      users: {
        total: userCount
      },
      products: {
        total: products.length,
        inStock,
        outOfStock
      },
      system: {
        uptime: Math.floor((Date.now() - startTime) / 1000),
        memoryUsage: process.memoryUsage(),
        cacheEnabled: redis.isEnabled(),
        activeWebSockets: totalWsConnections
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to get analytics snapshot')
    throw error
  }
}

/**
 * Get daily analytics summary
 */
export async function getDailyStats(date?: string): Promise<{
  date: string
  orders: { count: number; revenue: number }
  newUsers: number
}> {
  const targetDate = date || new Date().toISOString().split('T')[0]

  // This is a simplified version - in production you'd query by date range
  const orderStats = await getOrderStats()

  return {
    date: targetDate,
    orders: {
      count: orderStats.total,
      revenue: orderStats.totalRevenue
    },
    newUsers: 0 // Would need date filtering on users
  }
}

/**
 * Log analytics event
 */
export function logAnalyticsEvent(
  category: 'order' | 'payment' | 'user' | 'product' | 'error',
  action: string,
  data?: object
): void {
  logger.info({
    analytics: true,
    category,
    action,
    ...data
  }, `Analytics: ${category}/${action}`)
}

// Track specific events
export const analytics = {
  orderCreated: (orderId: string, amount: number, paymentMethod: string) => {
    logAnalyticsEvent('order', 'created', { orderId, amount, paymentMethod })
  },
  orderPaid: (orderId: string, amount: number) => {
    logAnalyticsEvent('order', 'paid', { orderId, amount })
  },
  orderCancelled: (orderId: string, reason?: string) => {
    logAnalyticsEvent('order', 'cancelled', { orderId, reason })
  },
  userRegistered: (userId: string, source?: string) => {
    logAnalyticsEvent('user', 'registered', { userId, source })
  },
  paymentFailed: (orderId: string, error: string, paymentMethod: string) => {
    logAnalyticsEvent('payment', 'failed', { orderId, error, paymentMethod })
  },
  productViewed: (productId: string, userId?: string) => {
    logAnalyticsEvent('product', 'viewed', { productId, userId })
  },
  searchPerformed: (query: string, resultsCount: number) => {
    logAnalyticsEvent('product', 'search', { query, resultsCount })
  }
}
