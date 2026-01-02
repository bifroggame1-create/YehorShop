import { ObjectId } from 'mongodb'
import {
  Seller, SellerStats, SellerBalance, SellerBadge,
  Dispute, DisputeStatus, DisputeResolution, DisputeReason, DisputeMessage,
  EscrowTransaction, EscrowStatus,
  KeyReplacement,
  getSellersCollection, getOrdersCollection, getProductsCollection,
  getDisputesCollection, getEscrowCollection, getKeyReplacementsCollection
} from './database'

// ============================================
// CONSTANTS
// ============================================

const ESCROW_DAYS_NEW_SELLER = 7
const ESCROW_DAYS_TRUSTED = 3
const ESCROW_DAYS_VERIFIED = 1
const SELLER_RESPONSE_HOURS = 24
const MAX_REPLACEMENTS_DEFAULT = 2
const DISPUTE_AUTO_RESOLVE_HOURS = 48

// Reputation weights
const WEIGHTS = {
  successfulOrder: 2,
  refund: -5,
  dispute: -10,
  disputeLost: -20,
  replacement: -3,
  oldAccount: 5,        // bonus per 30 days of account age
  verifiedBonus: 10
}

// Badge thresholds
const BADGE_THRESHOLDS = {
  trusted: { orders: 50, rating: 80, refundRate: 0.05 },
  top_seller: { orders: 200, rating: 90, refundRate: 0.02 },
  high_volume: { orders: 500 },
  risky: { refundRate: 0.15, disputeRate: 0.10 }
}

// ============================================
// SELLER INITIALIZATION
// ============================================

export function createDefaultSellerStats(): SellerStats {
  return {
    totalOrders: 0,
    successfulOrders: 0,
    refundsCount: 0,
    disputesCount: 0,
    disputesLost: 0,
    replacementsCount: 0,
    totalRevenue: 0
  }
}

export function createDefaultSellerBalance(): SellerBalance {
  return {
    available: 0,
    frozen: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
    totalEarned: 0
  }
}

export function initializeSeller(seller: Partial<Seller>): Seller {
  return {
    id: seller.id || `seller_${Date.now()}`,
    name: seller.name || 'Unknown',
    avatar: seller.avatar,
    rating: 50,  // start at 50/100
    ratingCount: 0,
    createdAt: new Date().toISOString(),
    stats: createDefaultSellerStats(),
    balance: createDefaultSellerBalance(),
    badges: ['new'],
    escrowDays: ESCROW_DAYS_NEW_SELLER,
    maxReplacementsPerOrder: MAX_REPLACEMENTS_DEFAULT,
    isVerified: false,
    isBlocked: false,
    ...seller
  } as Seller
}

// ============================================
// REPUTATION CALCULATION
// ============================================

export function calculateSellerRating(seller: Seller): number {
  const stats = seller.stats
  if (stats.totalOrders === 0) return 50

  // Base score from success rate
  const successRate = stats.successfulOrders / stats.totalOrders
  let score = successRate * 100

  // Apply penalties
  const refundPenalty = (stats.refundsCount / stats.totalOrders) * 30
  const disputePenalty = (stats.disputesCount / stats.totalOrders) * 20
  const disputeLostPenalty = (stats.disputesLost / stats.totalOrders) * 40

  score -= refundPenalty + disputePenalty + disputeLostPenalty

  // Age bonus (up to 10 points for 6+ months)
  const ageMs = Date.now() - new Date(seller.createdAt).getTime()
  const ageMonths = ageMs / (30 * 24 * 60 * 60 * 1000)
  score += Math.min(ageMonths * 1.5, 10)

  // Verified bonus
  if (seller.isVerified) score += 5

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function calculateSellerBadges(seller: Seller): SellerBadge[] {
  const badges: SellerBadge[] = []
  const stats = seller.stats

  // New seller (less than 10 orders)
  if (stats.totalOrders < 10) {
    badges.push('new')
    return badges
  }

  const refundRate = stats.refundsCount / stats.totalOrders
  const disputeRate = stats.disputesCount / stats.totalOrders

  // Risky seller
  if (refundRate >= BADGE_THRESHOLDS.risky.refundRate ||
      disputeRate >= BADGE_THRESHOLDS.risky.disputeRate) {
    badges.push('risky')
  }

  // High volume
  if (stats.totalOrders >= BADGE_THRESHOLDS.high_volume.orders) {
    badges.push('high_volume')
  }

  // Top seller
  if (stats.totalOrders >= BADGE_THRESHOLDS.top_seller.orders &&
      seller.rating >= BADGE_THRESHOLDS.top_seller.rating &&
      refundRate <= BADGE_THRESHOLDS.top_seller.refundRate) {
    badges.push('top_seller')
  }
  // Trusted (lower tier than top)
  else if (stats.totalOrders >= BADGE_THRESHOLDS.trusted.orders &&
           seller.rating >= BADGE_THRESHOLDS.trusted.rating &&
           refundRate <= BADGE_THRESHOLDS.trusted.refundRate) {
    badges.push('trusted')
  }

  // Verified (set by admin)
  if (seller.isVerified) {
    badges.push('verified')
  }

  return badges
}

export async function recalculateSellerReputation(sellerId: string): Promise<Seller | null> {
  const sellers = getSellersCollection()
  const orders = getOrdersCollection()
  const disputes = getDisputesCollection()

  const seller = await sellers.findOne({ id: sellerId })
  if (!seller) return null

  // Recalculate stats from orders
  const sellerOrders = await orders.find({ 'seller.id': sellerId }).toArray()

  const stats: SellerStats = {
    totalOrders: sellerOrders.length,
    successfulOrders: sellerOrders.filter(o => o.status === 'delivered').length,
    refundsCount: sellerOrders.filter(o => o.status === 'refunded').length,
    disputesCount: 0,
    disputesLost: 0,
    replacementsCount: 0,
    totalRevenue: sellerOrders
      .filter(o => ['delivered', 'paid'].includes(o.status))
      .reduce((sum, o) => sum + o.amount, 0),
    lastOrderAt: sellerOrders.length > 0
      ? sellerOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt
      : undefined
  }

  // Count disputes
  const sellerDisputes = await disputes.find({ sellerId }).toArray()
  stats.disputesCount = sellerDisputes.length
  stats.disputesLost = sellerDisputes.filter(d =>
    d.resolution && ['refund', 'replacement', 'partial_refund'].includes(d.resolution)
  ).length

  // Count replacements
  const replacements = await getKeyReplacementsCollection().find({ sellerId }).toArray()
  stats.replacementsCount = replacements.length

  // Calculate new rating and badges
  const updatedSeller = { ...seller, stats }
  const newRating = calculateSellerRating(updatedSeller)
  const newBadges = calculateSellerBadges(updatedSeller)

  // Determine escrow days based on trust
  let escrowDays = ESCROW_DAYS_NEW_SELLER
  if (newBadges.includes('verified')) escrowDays = ESCROW_DAYS_VERIFIED
  else if (newBadges.includes('trusted') || newBadges.includes('top_seller')) escrowDays = ESCROW_DAYS_TRUSTED

  // Update seller
  await sellers.updateOne(
    { id: sellerId },
    {
      $set: {
        stats,
        rating: newRating,
        badges: newBadges,
        escrowDays
      }
    }
  )

  return sellers.findOne({ id: sellerId })
}

// ============================================
// ESCROW SYSTEM
// ============================================

export async function createEscrowTransaction(
  orderId: string,
  sellerId: string,
  buyerId: string,
  amount: number,
  tenantId?: string
): Promise<EscrowTransaction> {
  const DEFAULT_TENANT_ID = tenantId || process.env.DEFAULT_TENANT_ID || 'yehorshop'
  const sellers = getSellersCollection()
  const escrow = getEscrowCollection()

  // Get seller's escrow days
  const seller = await sellers.findOne({ id: sellerId })
  const escrowDays = seller?.escrowDays || ESCROW_DAYS_NEW_SELLER

  const now = new Date()
  const releaseAt = new Date(now.getTime() + escrowDays * 24 * 60 * 60 * 1000)

  const transaction: EscrowTransaction = {
    tenantId: DEFAULT_TENANT_ID,
    id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    sellerId,
    buyerId,
    amount,
    status: 'frozen',
    frozenAt: now.toISOString(),
    releaseAt: releaseAt.toISOString(),
    createdAt: now.toISOString()
  }

  await escrow.insertOne(transaction)

  // Update seller frozen balance
  await sellers.updateOne(
    { id: sellerId },
    {
      $inc: {
        'balance.frozen': amount,
        'balance.totalEarned': amount
      }
    }
  )

  return transaction
}

export async function releaseEscrow(orderId: string): Promise<boolean> {
  const escrow = getEscrowCollection()
  const sellers = getSellersCollection()

  const transaction = await escrow.findOne({ orderId, status: 'frozen' })
  if (!transaction) return false

  // Update escrow status
  await escrow.updateOne(
    { orderId },
    {
      $set: {
        status: 'released',
        releasedAt: new Date().toISOString()
      }
    }
  )

  // Move from frozen to available
  await sellers.updateOne(
    { id: transaction.sellerId },
    {
      $inc: {
        'balance.frozen': -transaction.amount,
        'balance.available': transaction.amount
      }
    }
  )

  return true
}

export async function refundEscrow(orderId: string, disputeId?: string): Promise<boolean> {
  const escrow = getEscrowCollection()
  const sellers = getSellersCollection()

  const transaction = await escrow.findOne({ orderId, status: 'frozen' })
  if (!transaction) return false

  // Update escrow status
  await escrow.updateOne(
    { orderId },
    {
      $set: {
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        disputeId
      }
    }
  )

  // Remove from frozen balance and total earned
  await sellers.updateOne(
    { id: transaction.sellerId },
    {
      $inc: {
        'balance.frozen': -transaction.amount,
        'balance.totalEarned': -transaction.amount
      }
    }
  )

  return true
}

export async function processScheduledReleases(): Promise<number> {
  const escrow = getEscrowCollection()
  const disputes = getDisputesCollection()

  const now = new Date().toISOString()

  // Find all frozen transactions ready for release
  const ready = await escrow.find({
    status: 'frozen',
    releaseAt: { $lte: now }
  }).toArray()

  let released = 0

  for (const tx of ready) {
    // Check if there's an active dispute
    const activeDispute = await disputes.findOne({
      orderId: tx.orderId,
      status: { $in: ['open', 'seller_response', 'admin_review'] }
    })

    if (activeDispute) {
      // Mark as disputed, don't release
      await escrow.updateOne(
        { id: tx.id },
        { $set: { status: 'disputed', disputeId: activeDispute.id } }
      )
    } else {
      // Safe to release
      await releaseEscrow(tx.orderId)
      released++
    }
  }

  return released
}

// ============================================
// DISPUTE SYSTEM
// ============================================

export async function openDispute(
  orderId: string,
  buyerId: string,
  buyerName: string,
  reason: DisputeReason,
  description: string,
  tenantId?: string
): Promise<Dispute | { error: string }> {
  const DEFAULT_TENANT_ID = tenantId || process.env.DEFAULT_TENANT_ID || 'yehorshop'
  const orders = getOrdersCollection()
  const disputes = getDisputesCollection()
  const products = getProductsCollection()

  // Get order
  const order = await orders.findOne({ id: orderId })
  if (!order) return { error: 'Order not found' }

  // Verify buyer owns the order
  if (order.userId !== buyerId) return { error: 'Not your order' }

  // Check if dispute already exists
  const existing = await disputes.findOne({ orderId })
  if (existing) return { error: 'Dispute already exists for this order' }

  // Only allow disputes for delivered or paid orders
  if (!['delivered', 'paid'].includes(order.status)) {
    return { error: 'Cannot dispute this order status' }
  }

  // Get product for seller info
  const product = await products.findOne({ _id: order.productId })
  const sellerId = product?.seller?.id || 'unknown'
  const sellerName = product?.seller?.name || 'Unknown'

  const now = new Date()
  const responseDeadline = new Date(now.getTime() + SELLER_RESPONSE_HOURS * 60 * 60 * 1000)
  const autoResolveAt = new Date(now.getTime() + DISPUTE_AUTO_RESOLVE_HOURS * 60 * 60 * 1000)

  const dispute: Dispute = {
    tenantId: DEFAULT_TENANT_ID,
    id: `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    productId: order.productId,
    productName: order.productName,
    buyerId,
    buyerName,
    sellerId,
    sellerName,
    amount: order.amount,
    reason,
    description,
    status: 'open',
    messages: [{
      id: `msg_${Date.now()}`,
      senderId: buyerId,
      senderType: 'buyer',
      senderName: buyerName,
      content: description,
      createdAt: now.toISOString()
    }],
    replacementCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sellerResponseDeadline: responseDeadline.toISOString(),
    autoResolveAt: autoResolveAt.toISOString()
  }

  await disputes.insertOne(dispute)

  // Update escrow status if exists
  await getEscrowCollection().updateOne(
    { orderId },
    { $set: { status: 'disputed', disputeId: dispute.id } }
  )

  // Update seller stats
  await getSellersCollection().updateOne(
    { id: sellerId },
    { $inc: { 'stats.disputesCount': 1 } }
  )

  return dispute
}

export async function addDisputeMessage(
  disputeId: string,
  senderId: string,
  senderType: 'buyer' | 'seller' | 'admin',
  senderName: string,
  content: string,
  attachments?: string[]
): Promise<Dispute | null> {
  const disputes = getDisputesCollection()

  const message: DisputeMessage = {
    id: `msg_${Date.now()}`,
    senderId,
    senderType,
    senderName,
    content,
    attachments,
    createdAt: new Date().toISOString()
  }

  // Update status based on who responded
  let newStatus: DisputeStatus | undefined
  if (senderType === 'seller') {
    newStatus = 'seller_response'
  }

  const update: any = {
    $push: { messages: message },
    $set: { updatedAt: new Date().toISOString() }
  }

  if (newStatus) {
    update.$set.status = newStatus
    update.$unset = { autoResolveAt: 1 }  // seller responded, no auto-resolve
  }

  await disputes.updateOne({ id: disputeId }, update)

  return disputes.findOne({ id: disputeId })
}

export async function resolveDispute(
  disputeId: string,
  resolution: DisputeResolution,
  resolutionNote: string,
  resolvedBy: string
): Promise<Dispute | null> {
  const disputes = getDisputesCollection()
  const orders = getOrdersCollection()
  const sellers = getSellersCollection()

  const dispute = await disputes.findOne({ id: disputeId })
  if (!dispute) return null

  const now = new Date().toISOString()

  // Update dispute
  await disputes.updateOne(
    { id: disputeId },
    {
      $set: {
        status: 'resolved',
        resolution,
        resolutionNote,
        resolvedBy,
        resolvedAt: now,
        updatedAt: now
      },
      $unset: { autoResolveAt: 1 }
    }
  )

  // Handle resolution effects
  switch (resolution) {
    case 'refund':
      await refundEscrow(dispute.orderId, disputeId)
      await orders.updateOne({ id: dispute.orderId }, { $set: { status: 'refunded' } })
      await sellers.updateOne(
        { id: dispute.sellerId },
        { $inc: { 'stats.disputesLost': 1, 'stats.refundsCount': 1 } }
      )
      break

    case 'partial_refund':
      // Partial refund logic would go here
      await sellers.updateOne(
        { id: dispute.sellerId },
        { $inc: { 'stats.disputesLost': 1 } }
      )
      break

    case 'replacement':
      // Trigger key replacement
      await sellers.updateOne(
        { id: dispute.sellerId },
        { $inc: { 'stats.disputesLost': 1 } }
      )
      break

    case 'rejected':
    case 'buyer_fault':
      // Buyer loses, release escrow to seller
      await releaseEscrow(dispute.orderId)
      break
  }

  // Recalculate seller reputation
  await recalculateSellerReputation(dispute.sellerId)

  return disputes.findOne({ id: disputeId })
}

export async function processAutoResolveDisputes(): Promise<number> {
  const disputes = getDisputesCollection()
  const now = new Date().toISOString()

  // Find disputes that should auto-resolve
  const expired = await disputes.find({
    status: 'open',
    autoResolveAt: { $lte: now }
  }).toArray()

  let resolved = 0

  for (const dispute of expired) {
    await resolveDispute(
      dispute.id,
      'refund',
      'Auto-resolved in buyer favor due to no seller response',
      'system'
    )
    resolved++
  }

  return resolved
}

// ============================================
// KEY REPLACEMENT SYSTEM
// ============================================

export async function requestKeyReplacement(
  orderId: string,
  buyerId: string,
  reason: string,
  tenantId?: string
): Promise<KeyReplacement | Dispute | { error: string }> {
  const DEFAULT_TENANT_ID = tenantId || process.env.DEFAULT_TENANT_ID || 'yehorshop'
  const orders = getOrdersCollection()
  const products = getProductsCollection()
  const replacements = getKeyReplacementsCollection()
  const sellers = getSellersCollection()

  // Get order
  const order = await orders.findOne({ id: orderId })
  if (!order) return { error: 'Order not found' }

  // Verify buyer
  if (order.userId !== buyerId) return { error: 'Not your order' }

  // Only delivered orders can have replacement
  if (order.status !== 'delivered') return { error: 'Order not delivered' }

  // Get product
  const product = await products.findOne({ _id: order.productId })
  if (!product) return { error: 'Product not found' }

  const sellerId = product.seller?.id || 'unknown'

  // Get seller limits
  const seller = await sellers.findOne({ id: sellerId })
  const maxReplacements = seller?.maxReplacementsPerOrder || MAX_REPLACEMENTS_DEFAULT

  // Count existing replacements for this order
  const existingCount = await replacements.countDocuments({ orderId })

  if (existingCount >= maxReplacements) {
    // Escalate to dispute
    return openDispute(
      orderId,
      buyerId,
      order.userName || 'Buyer',
      'invalid_key',
      `Replacement limit exceeded. Original reason: ${reason}`
    )
  }

  // Check if keys available
  const availableKeys = product.deliveryKeys?.filter(k => !k.isUsed) || []

  if (availableKeys.length === 0) {
    // No keys available, escalate to dispute
    return openDispute(
      orderId,
      buyerId,
      order.userName || 'Buyer',
      'invalid_key',
      `No replacement keys available. Reason: ${reason}`
    )
  }

  // Get replacement key
  const newKey = availableKeys[0]

  // Mark old key info (we don't have the original key ID stored separately)
  const replacement: KeyReplacement = {
    tenantId: DEFAULT_TENANT_ID,
    id: `repl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    productId: order.productId,
    sellerId,
    buyerId,
    originalKeyId: 'unknown', // Would need to track this in order
    replacementKeyId: newKey.id,
    reason,
    status: 'replaced',
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString()
  }

  await replacements.insertOne(replacement)

  // Mark new key as used
  await products.updateOne(
    { _id: order.productId, 'deliveryKeys.id': newKey.id },
    {
      $set: {
        'deliveryKeys.$.isUsed': true,
        'deliveryKeys.$.usedByOrderId': orderId,
        'deliveryKeys.$.usedAt': new Date().toISOString()
      }
    }
  )

  // Update order with new delivery data
  const { encryptDeliveryData } = await import('./deliveryCrypto')
  let newDeliveryData: any = newKey.key
  if (product.deliveryInstructions) {
    newDeliveryData = `${newKey.key}\n\n${product.deliveryInstructions}`
  }

  try {
    newDeliveryData = encryptDeliveryData(newDeliveryData)
  } catch (err) {
    // Encryption not configured
  }

  await orders.updateOne(
    { id: orderId },
    { $set: { deliveryData: newDeliveryData } }
  )

  // Update seller stats
  await sellers.updateOne(
    { id: sellerId },
    { $inc: { 'stats.replacementsCount': 1 } }
  )

  // Recalculate reputation
  await recalculateSellerReputation(sellerId)

  return replacement
}

// ============================================
// ORDER LIFECYCLE HOOKS
// ============================================

export async function onOrderPaid(orderId: string): Promise<void> {
  const orders = getOrdersCollection()
  const products = getProductsCollection()

  const order = await orders.findOne({ id: orderId })
  if (!order) return

  const product = await products.findOne({ _id: order.productId })
  if (!product) return

  const sellerId = product.seller?.id
  if (!sellerId) return

  // Create escrow transaction
  await createEscrowTransaction(orderId, sellerId, order.userId, order.amount)

  // Update seller stats
  await getSellersCollection().updateOne(
    { id: sellerId },
    {
      $inc: { 'stats.totalOrders': 1 },
      $set: { 'stats.lastOrderAt': new Date().toISOString() }
    }
  )
}

export async function onOrderDelivered(orderId: string): Promise<void> {
  const orders = getOrdersCollection()
  const products = getProductsCollection()

  const order = await orders.findOne({ id: orderId })
  if (!order) return

  const product = await products.findOne({ _id: order.productId })
  const sellerId = product?.seller?.id
  if (!sellerId) return

  // Update seller stats
  await getSellersCollection().updateOne(
    { id: sellerId },
    { $inc: { 'stats.successfulOrders': 1 } }
  )

  // Recalculate reputation
  await recalculateSellerReputation(sellerId)
}

export async function onOrderRefunded(orderId: string): Promise<void> {
  const orders = getOrdersCollection()
  const products = getProductsCollection()

  const order = await orders.findOne({ id: orderId })
  if (!order) return

  const product = await products.findOne({ _id: order.productId })
  const sellerId = product?.seller?.id
  if (!sellerId) return

  // Refund escrow
  await refundEscrow(orderId)

  // Update seller stats
  await getSellersCollection().updateOne(
    { id: sellerId },
    { $inc: { 'stats.refundsCount': 1 } }
  )

  // Recalculate reputation
  await recalculateSellerReputation(sellerId)
}

// ============================================
// SCHEDULED JOBS (call via cron)
// ============================================

export async function runScheduledTasks(): Promise<{
  escrowReleased: number
  disputesAutoResolved: number
}> {
  const escrowReleased = await processScheduledReleases()
  const disputesAutoResolved = await processAutoResolveDisputes()

  return { escrowReleased, disputesAutoResolved }
}

console.log('[Marketplace] Module loaded')
