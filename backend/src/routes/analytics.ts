import { FastifyInstance } from 'fastify'
import { getAnalyticsSnapshot, getRequestMetrics, getDailyStats } from '../analytics'

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get analytics snapshot (admin only)
  fastify.get('/analytics/snapshot', {
    schema: {
      tags: ['Admin'],
      summary: 'Get analytics snapshot',
      description: 'Returns current system analytics including orders, users, products, and system metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                orders: { type: 'object' },
                users: { type: 'object' },
                products: { type: 'object' },
                system: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const snapshot = await getAnalyticsSnapshot()
      return { success: true, data: snapshot }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get request metrics
  fastify.get('/analytics/requests', {
    schema: {
      tags: ['Admin'],
      summary: 'Get request metrics',
      description: 'Returns request performance metrics including RPM, response times, error rates'
    }
  }, async () => {
    const metrics = getRequestMetrics()
    return { success: true, data: metrics }
  })

  // Get daily stats
  fastify.get('/analytics/daily', {
    schema: {
      tags: ['Admin'],
      summary: 'Get daily statistics',
      description: 'Returns daily order and user statistics'
    }
  }, async (request, reply) => {
    try {
      const { date } = request.query as any
      const stats = await getDailyStats(date)
      return { success: true, data: stats }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}
