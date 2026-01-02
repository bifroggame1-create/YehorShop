import nodemailer from 'nodemailer'
import { logger } from './logger'

// Email configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'Yehor Shop <noreply@yehorshop.ai>'

let transporter: nodemailer.Transporter | null = null

/**
 * Initialize email transporter
 */
export async function initEmail(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    logger.warn('Email not configured: SMTP_USER and SMTP_PASS required')
    return false
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    // Verify connection
    await transporter.verify()
    logger.info({ host: SMTP_HOST, port: SMTP_PORT }, 'Email transporter initialized')
    return true
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize email transporter')
    transporter = null
    return false
  }
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return transporter !== null
}

/**
 * Send email
 */
export async function sendEmail(options: {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email not configured, skipping send')
    return false
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    logger.info({
      messageId: info.messageId,
      to: options.to,
      subject: options.subject
    }, 'Email sent successfully')

    return true
  } catch (error) {
    logger.error({ err: error, to: options.to }, 'Failed to send email')
    return false
  }
}

// ============================================
// Email Templates
// ============================================

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(params: {
  email: string
  orderNumber: string
  productName: string
  amount: number
  paymentMethod: string
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .label { color: #666; font-size: 12px; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Yehor Shop</h1>
      <p>Подтверждение заказа</p>
    </div>
    <div class="content">
      <p>Спасибо за ваш заказ!</p>
      <div class="order-box">
        <div class="label">Номер заказа</div>
        <div class="value">${params.orderNumber}</div>
        <div class="label">Товар</div>
        <div class="value">${params.productName}</div>
        <div class="label">Сумма</div>
        <div class="value">${params.amount} ₽</div>
        <div class="label">Способ оплаты</div>
        <div class="value">${params.paymentMethod}</div>
      </div>
      <p>Мы уведомим вас, когда заказ будет готов к доставке.</p>
    </div>
    <div class="footer">
      <p>© 2025 Yehor Shop. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: params.email,
    subject: `Заказ ${params.orderNumber} подтвержден - Yehor Shop`,
    html,
    text: `Ваш заказ ${params.orderNumber} подтвержден. Товар: ${params.productName}. Сумма: ${params.amount} ₽.`
  })
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(params: {
  email: string
  orderNumber: string
  amount: number
  paidAt: string
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Оплата получена</h1>
    </div>
    <div class="content">
      <p>Ваша оплата успешно обработана!</p>
      <p><strong>Заказ:</strong> ${params.orderNumber}</p>
      <p><strong>Сумма:</strong> ${params.amount} ₽</p>
      <p><strong>Дата:</strong> ${new Date(params.paidAt).toLocaleString('ru-RU')}</p>
      <p>Ваш заказ будет обработан в ближайшее время.</p>
    </div>
    <div class="footer">
      <p>© 2025 Yehor Shop. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: params.email,
    subject: `Оплата заказа ${params.orderNumber} получена - Yehor Shop`,
    html,
    text: `Оплата заказа ${params.orderNumber} на сумму ${params.amount} ₽ получена.`
  })
}

/**
 * Send delivery notification with digital product
 */
export async function sendDeliveryNotification(params: {
  email: string
  orderNumber: string
  productName: string
  deliveryData: string
  instructions?: string
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .delivery-box { background: #e8f5e9; border: 2px dashed #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; word-break: break-all; }
    .instructions { background: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Yehor Shop</h1>
      <p>Ваш заказ доставлен!</p>
    </div>
    <div class="content">
      <p>Спасибо за покупку! Ваш заказ <strong>${params.orderNumber}</strong> успешно доставлен.</p>
      <p><strong>Товар:</strong> ${params.productName}</p>

      <div class="delivery-box">
        <strong>Ваш товар:</strong><br><br>
        ${params.deliveryData.replace(/\n/g, '<br>')}
      </div>

      ${params.instructions ? `
      <div class="instructions">
        <strong>Инструкции:</strong><br>
        ${params.instructions.replace(/\n/g, '<br>')}
      </div>
      ` : ''}

      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Сохраните это письмо. Данные товара не будут отправлены повторно.
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Yehor Shop. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: params.email,
    subject: `Заказ ${params.orderNumber} доставлен - Yehor Shop`,
    html,
    text: `Ваш заказ ${params.orderNumber} (${params.productName}) доставлен!\n\nВаш товар:\n${params.deliveryData}${params.instructions ? `\n\nИнструкции:\n${params.instructions}` : ''}`
  })
}

/**
 * Send admin notification about new order
 */
export async function sendAdminNewOrderNotification(params: {
  orderNumber: string
  productName: string
  amount: number
  userName: string
  paymentMethod: string
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    logger.debug('ADMIN_EMAIL not configured, skipping admin notification')
    return false
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <h2>Новый заказ на Yehor Shop</h2>
  <p><strong>Номер:</strong> ${params.orderNumber}</p>
  <p><strong>Товар:</strong> ${params.productName}</p>
  <p><strong>Сумма:</strong> ${params.amount} ₽</p>
  <p><strong>Покупатель:</strong> ${params.userName}</p>
  <p><strong>Способ оплаты:</strong> ${params.paymentMethod}</p>
  <p><a href="${process.env.FRONTEND_URL || 'https://fast-pay-ai.vercel.app'}/admin/orders">Перейти в админку</a></p>
</body>
</html>
`

  return sendEmail({
    to: adminEmail,
    subject: `Новый заказ ${params.orderNumber} - Yehor Shop`,
    html,
    text: `Новый заказ ${params.orderNumber}. Товар: ${params.productName}. Сумма: ${params.amount} ₽.`
  })
}
