/**
 * Multi-Bot Webhook Handler
 *
 * Handles incoming Telegram bot webhooks for multiple tenants.
 * Each tenant has its own bot token, and webhooks are routed based on bot token.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getTenantsCollection, getTenantByBotToken, Tenant } from './database'
import crypto from 'crypto'

// Cache for tenant lookup by bot token (expires after 5 minutes)
const tenantCache = new Map<string, { tenant: Tenant; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Resolve tenant by bot token with caching
 */
async function resolveTenantByBotToken(botToken: string): Promise<Tenant | null> {
  // Check cache first
  const cached = tenantCache.get(botToken)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant
  }

  // Look up in database
  const tenant = await getTenantByBotToken(botToken)

  if (tenant) {
    // Cache the result
    tenantCache.set(botToken, {
      tenant,
      expiresAt: Date.now() + CACHE_TTL_MS
    })
    return tenant
  }

  return null
}

/**
 * Get update type from Telegram update
 */
function getUpdateType(update: any): string {
  if (update.message) return 'message'
  if (update.callback_query) return 'callback_query'
  if (update.pre_checkout_query) return 'pre_checkout_query'
  if (update.successful_payment) return 'successful_payment'
  if (update.inline_query) return 'inline_query'
  if (update.chosen_inline_result) return 'chosen_inline_result'
  return 'unknown'
}

/**
 * Process incoming bot update
 */
async function processUpdate(tenant: Tenant, update: any, log: any): Promise<void> {
  log.info({
    tenantId: tenant.id,
    updateId: update.update_id,
    type: getUpdateType(update)
  }, 'Processing bot update')

  // Handle different update types
  if (update.message) {
    await handleMessage(tenant, update.message, log)
  } else if (update.callback_query) {
    await handleCallbackQuery(tenant, update.callback_query, log)
  } else if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(tenant, update.pre_checkout_query, log)
  } else if (update.message?.successful_payment) {
    await handleSuccessfulPayment(tenant, update.message, log)
  }
}

// ============================================
// TELEGRAM API HELPERS
// ============================================

async function sendTelegramRequest(tenant: Tenant, method: string, body: any): Promise<any> {
  if (!tenant.botToken) {
    throw new Error('Bot token not configured for tenant')
  }

  const url = `https://api.telegram.org/bot${tenant.botToken}/${method}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!data.ok) {
      console.error(`Telegram API error: ${method}`, data.description)
    }

    return data
  } catch (error) {
    console.error(`Failed to send Telegram request: ${method}`, error)
    throw error
  }
}

async function sendMessage(tenant: Tenant, chatId: number | string, text: string, options: any = {}): Promise<void> {
  await sendTelegramRequest(tenant, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  })
}

async function answerCallbackQuery(tenant: Tenant, queryId: string, text?: string): Promise<void> {
  await sendTelegramRequest(tenant, 'answerCallbackQuery', {
    callback_query_id: queryId,
    text
  })
}

async function answerPreCheckoutQuery(tenant: Tenant, queryId: string, ok: boolean, errorMessage?: string): Promise<void> {
  await sendTelegramRequest(tenant, 'answerPreCheckoutQuery', {
    pre_checkout_query_id: queryId,
    ok,
    error_message: errorMessage
  })
}

// ============================================
// MESSAGE HANDLERS
// ============================================

async function handleMessage(tenant: Tenant, message: any, log: any): Promise<void> {
  const chatId = message.chat.id
  const text = message.text || ''
  const userId = String(message.from.id)
  const userName = message.from.first_name + (message.from.last_name ? ' ' + message.from.last_name : '')

  log.info({
    tenantId: tenant.id,
    chatId,
    userId,
    text: text.substring(0, 50)
  }, 'Handling message')

  // Handle /start command
  if (text.startsWith('/start')) {
    const startParam = text.split(' ')[1]

    if (startParam) {
      // Handle referral
      if (startParam.startsWith('ref_')) {
        const referrerId = startParam.replace('ref_', '')
        log.info({ tenantId: tenant.id, userId, referrerId }, 'Processing referral')
      }
      // Handle order deep link
      else if (startParam.startsWith('order_')) {
        const orderId = startParam.replace('order_', '')
        await sendMessage(tenant, chatId, `Opening order ${orderId}...`)
      }
    }

    await sendWelcomeMessage(tenant, chatId, userName)
    return
  }

  // Handle /orders command
  if (text === '/orders') {
    await sendMessage(tenant, chatId, 'To view your orders, please open the store and go to the Orders section.')
    return
  }

  // Handle /help command
  if (text === '/help') {
    await sendHelpMessage(tenant, chatId)
    return
  }
}

async function handleCallbackQuery(tenant: Tenant, query: any, log: any): Promise<void> {
  const chatId = query.message.chat.id
  const data = query.data
  const userId = String(query.from.id)

  log.info({
    tenantId: tenant.id,
    chatId,
    userId,
    data
  }, 'Handling callback query')

  // Answer callback query to remove loading state
  await answerCallbackQuery(tenant, query.id)

  // Handle different callback data
  if (data.startsWith('order_status_')) {
    const orderId = data.replace('order_status_', '')
    await sendMessage(tenant, chatId, `Order ${orderId}: Processing...`)
  }
}

async function handlePreCheckoutQuery(tenant: Tenant, query: any, log: any): Promise<void> {
  log.info({
    tenantId: tenant.id,
    queryId: query.id,
    invoicePayload: query.invoice_payload,
    totalAmount: query.total_amount
  }, 'Handling pre-checkout query')

  try {
    // Parse payload to validate order
    const payload = JSON.parse(query.invoice_payload || '{}')

    if (payload.orderId) {
      const { getOrderById } = await import('./dataStore')
      const order = await getOrderById(payload.orderId)

      if (!order) {
        log.warn({ orderId: payload.orderId }, 'Order not found for pre-checkout')
        await answerPreCheckoutQuery(tenant, query.id, false, 'Заказ не найден')
        return
      }

      if (order.status !== 'pending') {
        log.warn({ orderId: payload.orderId, status: order.status }, 'Order already processed')
        await answerPreCheckoutQuery(tenant, query.id, false, 'Заказ уже обработан')
        return
      }
    }

    // Approve the checkout
    await answerPreCheckoutQuery(tenant, query.id, true)
  } catch (error) {
    log.error({ error, queryId: query.id }, 'Error in pre-checkout validation')
    await answerPreCheckoutQuery(tenant, query.id, false, 'Ошибка обработки заказа')
  }
}

async function handleSuccessfulPayment(tenant: Tenant, message: any, log: any): Promise<void> {
  const payment = message.successful_payment
  const chatId = message.chat.id

  log.info({
    tenantId: tenant.id,
    userId: message.from.id,
    totalAmount: payment.total_amount,
    currency: payment.currency,
    chargeId: payment.telegram_payment_charge_id,
    invoicePayload: payment.invoice_payload
  }, 'Successful payment received')

  try {
    // Parse payload
    const payload = JSON.parse(payment.invoice_payload || '{}')

    if (!payload.orderId) {
      log.warn('No orderId in payment payload')
      return
    }

    const { getOrderById, updateOrder, incrementPromoUsage } = await import('./dataStore')
    const { processAutoDelivery } = await import('./delivery')
    const { onOrderPaid, onOrderDelivered } = await import('./marketplace')

    // Get order
    const order = await getOrderById(payload.orderId)

    if (!order) {
      log.warn({ orderId: payload.orderId }, 'Order not found for successful payment')
      return
    }

    // Check if already processed
    if (order.status === 'paid' || order.status === 'delivered') {
      log.info({ orderId: order.id, status: order.status }, 'Order already processed')
      return
    }

    // Update order to paid
    const updatedOrder = await updateOrder(order.id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentId: payment.telegram_payment_charge_id,
    })

    if (!updatedOrder) {
      log.error({ orderId: order.id }, 'Failed to update order status')
      return
    }

    log.info({ orderId: order.id }, 'Telegram Stars order marked as paid')

    // Create escrow transaction
    try {
      await onOrderPaid(order.id)
    } catch (escrowError) {
      log.warn({ orderId: order.id, error: escrowError }, 'Failed to create escrow transaction')
    }

    // Increment promo code usage
    if (updatedOrder.promoCode) {
      try {
        await incrementPromoUsage(updatedOrder.promoCode)
      } catch (promoError) {
        log.warn({ orderId: order.id, error: promoError }, 'Failed to increment promo usage')
      }
    }

    // Process auto-delivery
    const deliveryResult = await processAutoDelivery(updatedOrder)

    if (deliveryResult.success) {
      log.info({ orderId: order.id }, 'Auto-delivery successful')

      try {
        await onOrderDelivered(order.id)
      } catch (statsError) {
        log.warn({ orderId: order.id, error: statsError }, 'Failed to update seller stats')
      }

      // Send delivery message to user
      await sendMessage(tenant, chatId, `✅ Оплата получена!\n\n📦 Ваш товар:\n${deliveryResult.deliveryData || 'Проверьте раздел "Мои заказы"'}`)
    } else {
      // Send confirmation message
      await sendMessage(tenant, chatId, `✅ Оплата получена!\n\nВаш заказ #${order.id} обрабатывается. Товар будет доставлен в ближайшее время.`)
    }

  } catch (error) {
    log.error({ error }, 'Error processing successful payment')
  }
}

async function sendWelcomeMessage(tenant: Tenant, chatId: number | string, userName: string): Promise<void> {
  const shopName = tenant.branding?.shopName || tenant.name || 'Yehor Shop'
  const webAppUrl = tenant.webAppUrl || process.env.WEBAPP_URL || 'https://app.yehorshop.io'

  const text = `Welcome to ${shopName}, ${userName}!\n\nClick the button below to open our store.`

  await sendMessage(tenant, chatId, text, {
    reply_markup: {
      inline_keyboard: [[
        {
          text: `Open ${shopName}`,
          web_app: { url: webAppUrl }
        }
      ]]
    }
  })
}

async function sendHelpMessage(tenant: Tenant, chatId: number | string): Promise<void> {
  const text = `
<b>Available Commands:</b>

/start - Open the store
/orders - View your orders
/help - Show this help message

<b>Support:</b>
For any questions, please contact our support team.
`
  await sendMessage(tenant, chatId, text)
}

// ============================================
// FASTIFY ROUTE REGISTRATION
// ============================================

export async function registerBotWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  // Dynamic webhook endpoint for each bot
  fastify.post('/bot/:botToken/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { botToken } = request.params as { botToken: string }
    const secretToken = request.headers['x-telegram-bot-api-secret-token'] as string | undefined

    try {
      // Resolve tenant by bot token
      const tenant = await resolveTenantByBotToken(botToken)

      if (!tenant) {
        request.log.warn({ botToken: botToken.substring(0, 10) + '...' }, 'Unknown bot token')
        reply.code(404)
        return { error: 'Bot not found' }
      }

      // Verify secret token if configured
      if (tenant.paymentConfig?.webhookSecret) {
        if (secretToken !== tenant.paymentConfig.webhookSecret) {
          request.log.warn({ tenantId: tenant.id }, 'Invalid webhook secret token')
          reply.code(401)
          return { error: 'Unauthorized' }
        }
      }

      // Process the update
      const update = request.body
      await processUpdate(tenant, update, request.log)

      return { ok: true }
    } catch (error: any) {
      request.log.error({ error, botToken: botToken.substring(0, 10) + '...' }, 'Webhook processing error')
      reply.code(500)
      return { error: 'Internal error' }
    }
  })

  // Webhook setup endpoint (for super admins)
  fastify.post('/bot/setup-webhook/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string }
    const { webhookUrl } = request.body as { webhookUrl?: string }

    try {
      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        reply.code(400)
        return { error: 'Bot token not configured' }
      }

      // Generate webhook URL if not provided
      const baseUrl = webhookUrl || process.env.WEBHOOK_BASE_URL || process.env.API_URL || 'https://api.yehorshop.io'
      const fullWebhookUrl = `${baseUrl}/bot/${tenant.botToken}/webhook`

      // Generate a random secret token
      const secretToken = crypto.randomBytes(32).toString('hex')

      // Set webhook with Telegram
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullWebhookUrl,
          secret_token: secretToken,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment']
        })
      })

      const result = await response.json() as { ok: boolean; description?: string }

      if (result.ok) {
        // Store the secret token in tenant config
        await getTenantsCollection().updateOne(
          { id: tenantId },
          { $set: { 'paymentConfig.webhookSecret': secretToken } }
        )

        // Clear cache
        tenantCache.delete(tenant.botToken)

        request.log.info({ tenantId, webhookUrl: fullWebhookUrl }, 'Webhook configured')

        return {
          success: true,
          webhookUrl: fullWebhookUrl,
          message: 'Webhook configured successfully'
        }
      } else {
        request.log.error({ tenantId, error: result.description }, 'Failed to set webhook')
        reply.code(500)
        return { error: result.description }
      }
    } catch (error: any) {
      request.log.error({ error, tenantId }, 'Error setting up webhook')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Get webhook info for a tenant
  fastify.get('/bot/webhook-info/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string }

    try {
      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        reply.code(400)
        return { error: 'Bot token not configured' }
      }

      // Get webhook info from Telegram
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/getWebhookInfo`)
      const result = await response.json() as { ok: boolean; result?: any; description?: string }

      if (result.ok) {
        return {
          success: true,
          webhookInfo: {
            url: result.result.url,
            hasCustomCertificate: result.result.has_custom_certificate,
            pendingUpdateCount: result.result.pending_update_count,
            lastErrorDate: result.result.last_error_date,
            lastErrorMessage: result.result.last_error_message
          }
        }
      } else {
        reply.code(500)
        return { error: result.description }
      }
    } catch (error: any) {
      request.log.error({ error, tenantId }, 'Error getting webhook info')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Delete webhook for a tenant
  fastify.delete('/bot/webhook/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string }

    try {
      const tenant = await getTenantsCollection().findOne({ id: tenantId })

      if (!tenant) {
        reply.code(404)
        return { error: 'Tenant not found' }
      }

      if (!tenant.botToken) {
        reply.code(400)
        return { error: 'Bot token not configured' }
      }

      // Delete webhook
      const response = await fetch(`https://api.telegram.org/bot${tenant.botToken}/deleteWebhook`)
      const result = await response.json() as { ok: boolean; description?: string }

      if (result.ok) {
        // Clear secret token
        await getTenantsCollection().updateOne(
          { id: tenantId },
          { $unset: { 'paymentConfig.webhookSecret': 1 } }
        )

        // Clear cache
        tenantCache.delete(tenant.botToken)

        request.log.info({ tenantId }, 'Webhook deleted')

        return { success: true, message: 'Webhook deleted successfully' }
      } else {
        reply.code(500)
        return { error: result.description }
      }
    } catch (error: any) {
      request.log.error({ error, tenantId }, 'Error deleting webhook')
      reply.code(500)
      return { error: error.message }
    }
  })

  fastify.log.info('Multi-bot webhook handler registered')
}
