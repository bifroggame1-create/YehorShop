import nodemailer from 'nodemailer'

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@yehorshop.ai'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS
  } : undefined
})

// Email templates
function getOrderCreatedTemplate(order: any): { subject: string; html: string; text: string } {
  return {
    subject: `Новый заказ #${order.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">🛒 Новый заказ</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>ID заказа:</strong> ${order.id}</p>
          <p><strong>Товар:</strong> ${order.productName}</p>
          ${order.variantName ? `<p><strong>Вариант:</strong> ${order.variantName}</p>` : ''}
          <p><strong>Сумма:</strong> ${order.amount} ₽</p>
          <p><strong>Покупатель:</strong> ${order.userName || 'ID: ' + order.userId}</p>
          <p><strong>Способ оплаты:</strong> ${order.paymentMethod}</p>
          <p><strong>Статус:</strong> ${order.status}</p>
          <p><strong>Дата:</strong> ${new Date(order.createdAt).toLocaleString('ru-RU')}</p>
        </div>
      </div>
    `,
    text: `Новый заказ #${order.id}\nТовар: ${order.productName}\nСумма: ${order.amount} ₽\nПокупатель: ${order.userName || order.userId}`
  }
}

function getOrderPaidTemplate(order: any): { subject: string; html: string; text: string } {
  return {
    subject: `✅ Заказ #${order.id} оплачен`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">✅ Заказ оплачен</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>ID заказа:</strong> ${order.id}</p>
          <p><strong>Товар:</strong> ${order.productName}</p>
          <p><strong>Сумма:</strong> ${order.amount} ₽</p>
          <p><strong>Покупатель:</strong> ${order.userName || 'ID: ' + order.userId}</p>
          <p><strong>Оплачен:</strong> ${order.paidAt ? new Date(order.paidAt).toLocaleString('ru-RU') : 'Сейчас'}</p>
        </div>
        <p style="color: #6B7280; margin-top: 20px;">Требуется выдача товара.</p>
      </div>
    `,
    text: `Заказ #${order.id} оплачен\nТовар: ${order.productName}\nСумма: ${order.amount} ₽`
  }
}

function getOrderDeliveredTemplate(order: any): { subject: string; html: string; text: string } {
  return {
    subject: `📦 Заказ #${order.id} доставлен`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">📦 Заказ доставлен</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>ID заказа:</strong> ${order.id}</p>
          <p><strong>Товар:</strong> ${order.productName}</p>
          <p><strong>Покупатель:</strong> ${order.userName || 'ID: ' + order.userId}</p>
          <p><strong>Доставлен:</strong> ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('ru-RU') : 'Сейчас'}</p>
        </div>
      </div>
    `,
    text: `Заказ #${order.id} доставлен\nТовар: ${order.productName}`
  }
}

function getCustomerOrderConfirmationTemplate(order: any): { subject: string; html: string; text: string } {
  return {
    subject: `Ваш заказ #${order.id} создан`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Спасибо за заказ!</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Номер заказа:</strong> ${order.id}</p>
          <p><strong>Товар:</strong> ${order.productName}</p>
          ${order.variantName ? `<p><strong>Вариант:</strong> ${order.variantName}</p>` : ''}
          <p><strong>Сумма к оплате:</strong> ${order.amount} ₽</p>
        </div>
        <p style="color: #6B7280; margin-top: 20px;">После оплаты товар будет доставлен автоматически или вручную в течение 24 часов.</p>
      </div>
    `,
    text: `Ваш заказ #${order.id} создан\nТовар: ${order.productName}\nСумма: ${order.amount} ₽`
  }
}

function getCustomerDeliveryTemplate(order: any, deliveryData: string): { subject: string; html: string; text: string } {
  return {
    subject: `📦 Ваш заказ #${order.id} доставлен!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">📦 Ваш товар готов!</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Номер заказа:</strong> ${order.id}</p>
          <p><strong>Товар:</strong> ${order.productName}</p>
          <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-family: monospace; word-break: break-all;">${deliveryData}</p>
          </div>
          ${order.deliveryNote ? `<p style="color: #6B7280; margin-top: 15px;">${order.deliveryNote}</p>` : ''}
        </div>
        <p style="color: #6B7280; margin-top: 20px;">Спасибо за покупку! Если возникнут вопросы - напишите в поддержку.</p>
      </div>
    `,
    text: `Ваш заказ #${order.id} доставлен!\nТовар: ${order.productName}\n\nДанные для доступа:\n${deliveryData}`
  }
}

// Send email helper
async function sendEmail(to: string, template: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured, skipping email')
    return false
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
    console.log(`[Email] Sent to ${to}: ${template.subject}`)
    return true
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return false
  }
}

// Public API
export async function sendOrderCreatedNotification(order: any, customerEmail?: string): Promise<void> {
  // Send to admin
  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, getOrderCreatedTemplate(order))
  }
  // Send confirmation to customer
  if (customerEmail) {
    await sendEmail(customerEmail, getCustomerOrderConfirmationTemplate(order))
  }
}

export async function sendOrderPaidNotification(order: any): Promise<void> {
  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, getOrderPaidTemplate(order))
  }
}

export async function sendOrderDeliveredNotification(order: any, deliveryData: string, customerEmail?: string): Promise<void> {
  // Send to admin
  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, getOrderDeliveredTemplate(order))
  }
  // Send delivery data to customer
  if (customerEmail) {
    await sendEmail(customerEmail, getCustomerDeliveryTemplate(order, deliveryData))
  }
}

// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured')
    return false
  }

  try {
    await transporter.verify()
    console.log('[Email] SMTP connection verified')
    return true
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error)
    return false
  }
}

console.log('[Email] Service loaded, SMTP configured:', !!SMTP_USER && !!SMTP_PASS)
