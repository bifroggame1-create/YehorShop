import { logger } from './logger'
import { Order } from './database'

// Telegram Bot API configuration
const BOT_TOKEN = process.env.BOT_TOKEN
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

// Notification settings (can be overridden via API)
interface NotificationSettings {
  enabled: boolean
  notifyOnPayment: boolean
  notifyOnDelivery: boolean
  notifyAdminsOnNewOrder: boolean
}

let notificationSettings: NotificationSettings = {
  enabled: true,
  notifyOnPayment: true,
  notifyOnDelivery: true,
  notifyAdminsOnNewOrder: true
}

/**
 * Check if Telegram notifications are configured
 */
export function isTelegramConfigured(): boolean {
  return !!BOT_TOKEN && BOT_TOKEN !== 'your_bot_token_here'
}

/**
 * Get current notification settings
 */
export function getNotificationSettings(): NotificationSettings {
  return { ...notificationSettings }
}

/**
 * Update notification settings
 */
export function updateNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  notificationSettings = { ...notificationSettings, ...settings }
  logger.info({ settings: notificationSettings }, 'Telegram notification settings updated')
  return notificationSettings
}

/**
 * Get admin IDs from environment
 */
function getAdminIds(): string[] {
  const adminIdsStr = process.env.ADMIN_IDS || ''
  return adminIdsStr
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0 && !isNaN(Number(id)))
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: { parseMode?: 'HTML' | 'Markdown' } = {}
): Promise<boolean> {
  if (!isTelegramConfigured()) {
    logger.warn('Telegram bot not configured, skipping notification')
    return false
  }

  if (!notificationSettings.enabled) {
    logger.debug('Telegram notifications disabled, skipping')
    return false
  }

  try {
    const url = `${TELEGRAM_API_BASE}${BOT_TOKEN}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'HTML'
      })
    })

    const result = await response.json() as { ok: boolean; description?: string }

    if (!result.ok) {
      logger.error({ chatId, error: result.description }, 'Failed to send Telegram message')
      return false
    }

    logger.info({ chatId }, 'Telegram message sent successfully')
    return true
  } catch (error: any) {
    logger.error({ err: error, chatId }, 'Error sending Telegram message')
    return false
  }
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    'cryptobot': 'CryptoBot',
    'cactuspay-sbp': 'SBP',
    'cactuspay-card': 'Card',
    'cactuspay-yoomoney': 'YooMoney',
    'cactuspay-crypto': 'Crypto',
    'cactuspay-nspk': 'NSPK'
  }
  return methods[method] || method
}

/**
 * Format currency amount
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Send order notification to admins
 * Called when a new order is created and paid
 */
export async function sendOrderNotification(
  order: Order,
  adminIds?: string[]
): Promise<{ success: boolean; sentCount: number }> {
  if (!notificationSettings.notifyAdminsOnNewOrder) {
    return { success: true, sentCount: 0 }
  }

  const targetAdmins = adminIds || getAdminIds()

  if (targetAdmins.length === 0) {
    logger.warn('No admin IDs configured for order notifications')
    return { success: false, sentCount: 0 }
  }

  const message = `
<b>New Order Paid!</b>

<b>Order:</b> <code>${order.id}</code>
<b>Product:</b> ${escapeHtml(order.productName)}${order.variantName ? ` - ${escapeHtml(order.variantName)}` : ''}
<b>Amount:</b> ${formatAmount(order.amount)}
<b>Payment:</b> ${formatPaymentMethod(order.paymentMethod)}

<b>Customer:</b> ${order.userName ? escapeHtml(order.userName) : 'Unknown'}${order.userUsername ? ` (@${escapeHtml(order.userUsername)})` : ''}
<b>User ID:</b> <code>${order.userId}</code>

<b>Time:</b> ${new Date(order.paidAt || order.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
${order.promoCode ? `\n<b>Promo:</b> ${escapeHtml(order.promoCode)}` : ''}
`.trim()

  let sentCount = 0
  for (const adminId of targetAdmins) {
    const sent = await sendTelegramMessage(adminId, message)
    if (sent) sentCount++
  }

  return { success: sentCount > 0, sentCount }
}

/**
 * Send delivery notification to user
 * Called when order is delivered (auto or manual)
 */
export async function sendDeliveryNotification(
  order: Order,
  userId?: string
): Promise<boolean> {
  if (!notificationSettings.notifyOnDelivery) {
    return true
  }

  const targetUserId = userId || order.userId

  if (!targetUserId || targetUserId === 'anonymous') {
    logger.warn({ orderId: order.id }, 'No user ID for delivery notification')
    return false
  }

  // Don't send delivery data in notification for security
  const message = `
<b>Order Delivered!</b>

<b>Order:</b> <code>${order.id}</code>
<b>Product:</b> ${escapeHtml(order.productName)}${order.variantName ? ` - ${escapeHtml(order.variantName)}` : ''}

Your order has been delivered! Check the order details in the app to get your product.

Thank you for your purchase!
`.trim()

  return sendTelegramMessage(targetUserId, message)
}

/**
 * Send payment confirmation notification
 * Called when payment is received and confirmed
 */
export async function sendPaymentNotification(order: Order): Promise<boolean> {
  if (!notificationSettings.notifyOnPayment) {
    return true
  }

  const userId = order.userId

  if (!userId || userId === 'anonymous') {
    logger.warn({ orderId: order.id }, 'No user ID for payment notification')
    return false
  }

  const message = `
<b>Payment Confirmed!</b>

<b>Order:</b> <code>${order.id}</code>
<b>Product:</b> ${escapeHtml(order.productName)}${order.variantName ? ` - ${escapeHtml(order.variantName)}` : ''}
<b>Amount:</b> ${formatAmount(order.amount)}

Your payment has been received. Your order is being processed.
`.trim()

  return sendTelegramMessage(userId, message)
}

/**
 * Send custom notification to user
 */
export async function sendUserNotification(
  userId: string,
  message: string
): Promise<boolean> {
  return sendTelegramMessage(userId, message)
}

/**
 * Send custom notification to all admins
 */
export async function sendAdminNotification(
  message: string,
  adminIds?: string[]
): Promise<{ success: boolean; sentCount: number }> {
  const targetAdmins = adminIds || getAdminIds()

  if (targetAdmins.length === 0) {
    logger.warn('No admin IDs configured')
    return { success: false, sentCount: 0 }
  }

  let sentCount = 0
  for (const adminId of targetAdmins) {
    const sent = await sendTelegramMessage(adminId, message)
    if (sent) sentCount++
  }

  return { success: sentCount > 0, sentCount }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Test Telegram connection by sending a test message to admins
 */
export async function testTelegramConnection(): Promise<{
  configured: boolean
  adminIds: string[]
  testResults: Array<{ adminId: string; success: boolean }>
}> {
  const configured = isTelegramConfigured()
  const adminIds = getAdminIds()

  if (!configured || adminIds.length === 0) {
    return {
      configured,
      adminIds,
      testResults: []
    }
  }

  const testResults: Array<{ adminId: string; success: boolean }> = []
  const testMessage = `
<b>Telegram Notifications Test</b>

This is a test message from Yehor Shop.
Notifications are working correctly!

<i>Time: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</i>
`.trim()

  for (const adminId of adminIds) {
    const success = await sendTelegramMessage(adminId, testMessage)
    testResults.push({ adminId, success })
  }

  return { configured, adminIds, testResults }
}

console.log('Telegram Notifier module loaded', {
  configured: isTelegramConfigured(),
  adminIds: getAdminIds().length
})
