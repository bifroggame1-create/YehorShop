import { FastifyInstance } from 'fastify'
import { adminMiddleware } from '../auth'
import {
  isTelegramConfigured,
  getNotificationSettings,
  updateNotificationSettings,
  testTelegramConnection,
  sendUserNotification,
  sendAdminNotification
} from '../telegramNotifier'

export async function notificationRoutes(fastify: FastifyInstance) {
  // ============================================
  // TELEGRAM NOTIFICATIONS
  // ============================================

  // Get notification settings
  fastify.get('/admin/notifications', { preHandler: adminMiddleware }, async () => {
    return {
      success: true,
      configured: isTelegramConfigured(),
      settings: getNotificationSettings()
    }
  })

  // Update notification settings
  fastify.put('/admin/notifications', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const settings = request.body as {
        enabled?: boolean
        notifyOnPayment?: boolean
        notifyOnDelivery?: boolean
        notifyAdminsOnNewOrder?: boolean
      }

      const updated = updateNotificationSettings(settings)

      return { success: true, settings: updated }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Test Telegram notifications
  fastify.post('/admin/notifications/test', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const result = await testTelegramConnection()

      return {
        success: result.testResults.some(r => r.success),
        ...result
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Send custom notification to user
  fastify.post('/admin/notifications/send-user', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { userId, message } = request.body as { userId: string; message: string }

      if (!userId || !message) {
        reply.code(400)
        return { success: false, error: 'userId and message are required' }
      }

      const sent = await sendUserNotification(userId, message)

      return { success: sent }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Send custom notification to all admins
  fastify.post('/admin/notifications/send-admins', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { message } = request.body as { message: string }

      if (!message) {
        reply.code(400)
        return { success: false, error: 'message is required' }
      }

      const result = await sendAdminNotification(message)

      return result
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}
