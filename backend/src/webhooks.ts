import { getDB } from './database'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

// Webhook event types
export type WebhookEvent =
  | 'order.created'
  | 'order.paid'
  | 'order.delivered'
  | 'order.cancelled'
  | 'order.refunded'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'user.created'
  | 'review.created'

// Webhook configuration
export interface Webhook {
  _id?: ObjectId | string
  id: string
  name: string
  url: string
  secret: string
  events: WebhookEvent[]
  isActive: boolean
  headers?: Record<string, string>
  retryCount?: number
  lastTriggeredAt?: string
  lastError?: string
  createdAt: string
  updatedAt?: string
}

// Webhook delivery log
export interface WebhookDelivery {
  _id?: ObjectId | string
  webhookId: string
  event: WebhookEvent
  payload: any
  statusCode?: number
  response?: string
  error?: string
  duration?: number
  success: boolean
  createdAt: string
}

// Get webhooks collection
function getWebhooksCollection() {
  return getDB().collection<Webhook>('webhooks')
}

// Get delivery logs collection
function getDeliveryLogsCollection() {
  return getDB().collection<WebhookDelivery>('webhookDeliveries')
}

// Generate webhook secret
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate signature for payload
function generateSignature(payload: string, secret: string): string {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// CRUD operations
export async function getAllWebhooks(): Promise<Webhook[]> {
  return getWebhooksCollection().find({}).toArray()
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  return getWebhooksCollection().findOne({
    $or: [{ id }, { _id: new ObjectId(id) }]
  })
}

export async function createWebhook(webhook: Omit<Webhook, '_id' | 'id' | 'secret' | 'createdAt'>): Promise<Webhook> {
  const newWebhook: Webhook = {
    ...webhook,
    id: `wh_${Date.now()}`,
    secret: generateWebhookSecret(),
    createdAt: new Date().toISOString()
  }

  await getWebhooksCollection().insertOne(newWebhook)
  return newWebhook
}

export async function updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | null> {
  // Don't allow updating secret via this method
  delete updates.secret

  const result = await getWebhooksCollection().findOneAndUpdate(
    { $or: [{ id }, { _id: new ObjectId(id) }] },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  )

  return result
}

export async function deleteWebhook(id: string): Promise<boolean> {
  const result = await getWebhooksCollection().deleteOne({
    $or: [{ id }, { _id: new ObjectId(id) }]
  })
  return result.deletedCount > 0
}

export async function regenerateSecret(id: string): Promise<string | null> {
  const newSecret = generateWebhookSecret()

  const result = await getWebhooksCollection().findOneAndUpdate(
    { $or: [{ id }, { _id: new ObjectId(id) }] },
    { $set: { secret: newSecret, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  )

  return result ? newSecret : null
}

// Trigger webhook
export async function triggerWebhook(event: WebhookEvent, data: any): Promise<void> {
  // Get all active webhooks for this event
  const webhooks = await getWebhooksCollection().find({
    isActive: true,
    events: event
  }).toArray()

  // Trigger each webhook
  await Promise.all(webhooks.map(webhook => deliverWebhook(webhook, event, data)))
}

// Deliver webhook with retries
async function deliverWebhook(webhook: Webhook, event: WebhookEvent, data: any): Promise<void> {
  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
    webhookId: webhook.id
  })

  const signature = generateSignature(payload, webhook.secret)

  const startTime = Date.now()
  let statusCode: number | undefined
  let response: string | undefined
  let error: string | undefined
  let success = false

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'X-Webhook-Id': webhook.id,
      ...webhook.headers
    }

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    statusCode = res.status
    response = await res.text().catch(() => '')
    success = res.ok

    if (!success) {
      error = `HTTP ${statusCode}: ${response.slice(0, 200)}`
    }
  } catch (err: any) {
    error = err.message || 'Unknown error'
  }

  const duration = Date.now() - startTime

  // Log delivery
  const delivery: WebhookDelivery = {
    webhookId: webhook.id,
    event,
    payload: data,
    statusCode,
    response: response?.slice(0, 1000),
    error,
    duration,
    success,
    createdAt: new Date().toISOString()
  }

  await getDeliveryLogsCollection().insertOne(delivery)

  // Update webhook status
  await getWebhooksCollection().updateOne(
    { id: webhook.id },
    {
      $set: {
        lastTriggeredAt: new Date().toISOString(),
        lastError: error || undefined
      }
    }
  )

  // Retry on failure (up to 3 times)
  if (!success && (webhook.retryCount || 0) < 3) {
    await getWebhooksCollection().updateOne(
      { id: webhook.id },
      { $inc: { retryCount: 1 } }
    )

    // Retry after delay
    setTimeout(() => {
      deliverWebhook(webhook, event, data)
    }, Math.pow(2, webhook.retryCount || 0) * 1000) // Exponential backoff
  } else if (success) {
    // Reset retry count on success
    await getWebhooksCollection().updateOne(
      { id: webhook.id },
      { $set: { retryCount: 0 } }
    )
  }
}

// Get delivery logs
export async function getDeliveryLogs(webhookId?: string, limit: number = 50): Promise<WebhookDelivery[]> {
  const filter = webhookId ? { webhookId } : {}

  return getDeliveryLogsCollection()
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

// Test webhook
export async function testWebhook(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const webhook = await getWebhookById(id)
  if (!webhook) {
    return { success: false, error: 'Webhook not found' }
  }

  const testPayload = JSON.stringify({
    event: 'test',
    data: { message: 'This is a test webhook delivery' },
    timestamp: new Date().toISOString(),
    webhookId: webhook.id
  })

  const signature = generateSignature(testPayload, webhook.secret)

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test',
        'X-Webhook-Id': webhook.id,
        ...webhook.headers
      },
      body: testPayload,
      signal: AbortSignal.timeout(10000)
    })

    return {
      success: res.ok,
      statusCode: res.status,
      error: res.ok ? undefined : `HTTP ${res.status}`
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error'
    }
  }
}

console.log('[Webhooks] Module loaded')
