import { MongoClient, Db, Collection, ObjectId } from 'mongodb'

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB_NAME || 'yehorshop'

let client: MongoClient | null = null
let db: Db | null = null

// ============================================
// MULTI-TENANT CORE
// ============================================

/**
 * TenantScoped - Base interface for all tenant-scoped entities
 * EVERY entity in the system MUST include tenantId
 */
export interface TenantScoped {
  tenantId: string
}

// Tenant status
export type TenantStatus = 'pending' | 'active' | 'suspended' | 'cancelled'

// Tenant branding configuration
export interface TenantBranding {
  shopName: string
  logo?: string           // URL or base64
  favicon?: string
  primaryColor?: string   // Hex color
  accentColor?: string
  bannerUrl?: string
  footerText?: string
  welcomeMessage?: string
}

// Tenant settings
export interface TenantSettings {
  currency: 'RUB' | 'USD' | 'EUR' | 'USDT'
  language: 'ru' | 'en'
  timezone: string
  enableReferrals: boolean
  referralBonusAmount: number
  enableReviews: boolean
  enableChat: boolean
  autoDeliveryEnabled: boolean
  requireEmailOnCheckout: boolean
  notifyAdminsOnNewOrder: boolean
  notifyOnPayment: boolean
  notifyOnDelivery: boolean
}

// Tenant commission rules
export interface TenantCommissionRules {
  platformFeePercent: number     // Platform takes X% of each sale
  minimumPayout: number          // Minimum balance for payout
  payoutSchedule: 'instant' | 'daily' | 'weekly' | 'manual'
  escrowDaysDefault: number      // Default escrow hold period
}

// Tenant payment configuration
export interface TenantPaymentConfig {
  cryptoBotToken?: string
  cactusPayToken?: string
  webhookSecret?: string
  enabledMethods: ('cryptobot' | 'cactuspay-sbp' | 'cactuspay-card' | 'crypto')[]
}

// Main Tenant entity
export interface Tenant {
  _id?: string | ObjectId
  id: string                     // Unique tenant ID (e.g., 'yehorshop', 'myshop')
  slug: string                   // URL-friendly slug
  name: string                   // Display name
  status: TenantStatus
  branding: TenantBranding
  settings: TenantSettings
  commissionRules: TenantCommissionRules
  paymentConfig: TenantPaymentConfig

  // Telegram Bot
  botToken?: string
  botUsername?: string
  webAppUrl?: string

  // Contact info
  ownerEmail?: string
  supportEmail?: string
  supportTelegram?: string

  // Timestamps
  createdAt: string
  activatedAt?: string
  suspendedAt?: string
}

// ============================================
// TENANT BILLING
// ============================================

export type BillingPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type BillingStatus = 'active' | 'past_due' | 'suspended' | 'cancelled' | 'trial'

export interface PlanLimits {
  productsLimit: number
  ordersPerMonth: number
  sellersLimit: number
  adminsLimit: number
  storageGB: number
  customDomain: boolean
  whiteLabel: boolean
  apiAccess: boolean
  prioritySupport: boolean
}

export interface UsageStats {
  productsCount: number
  ordersThisMonth: number
  sellersCount: number
  adminsCount: number
  storageUsedMB: number
  lastUpdated: string
}

export interface SubscriptionInfo {
  pricePerMonth: number
  currency: 'RUB' | 'USD'
  nextBillingDate?: string
  paymentMethod?: 'card' | 'crypto' | 'invoice'
  lastPaymentDate?: string
  lastPaymentAmount?: number
  trialEndsAt?: string
}

export interface BillingEvent {
  id: string
  type: 'payment' | 'refund' | 'upgrade' | 'downgrade' | 'suspension' | 'reactivation'
  amount?: number
  currency?: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface TenantBilling extends TenantScoped {
  _id?: string | ObjectId
  plan: BillingPlan
  status: BillingStatus
  limits: PlanLimits
  usage: UsageStats
  subscription: SubscriptionInfo
  billingHistory: BillingEvent[]
  createdAt: string
  updatedAt: string
}

// Billing plans configuration
export const BILLING_PLANS: Record<BillingPlan, { limits: PlanLimits; priceRUB: number; priceUSD: number }> = {
  free: {
    limits: {
      productsLimit: 10,
      ordersPerMonth: 50,
      sellersLimit: 1,
      adminsLimit: 1,
      storageGB: 0.5,
      customDomain: false,
      whiteLabel: false,
      apiAccess: false,
      prioritySupport: false
    },
    priceRUB: 0,
    priceUSD: 0
  },
  starter: {
    limits: {
      productsLimit: 100,
      ordersPerMonth: 500,
      sellersLimit: 5,
      adminsLimit: 3,
      storageGB: 5,
      customDomain: false,
      whiteLabel: false,
      apiAccess: true,
      prioritySupport: false
    },
    priceRUB: 2990,
    priceUSD: 29
  },
  pro: {
    limits: {
      productsLimit: 1000,
      ordersPerMonth: 5000,
      sellersLimit: 25,
      adminsLimit: 10,
      storageGB: 25,
      customDomain: true,
      whiteLabel: true,
      apiAccess: true,
      prioritySupport: true
    },
    priceRUB: 9990,
    priceUSD: 99
  },
  enterprise: {
    limits: {
      productsLimit: -1, // unlimited
      ordersPerMonth: -1,
      sellersLimit: -1,
      adminsLimit: -1,
      storageGB: 100,
      customDomain: true,
      whiteLabel: true,
      apiAccess: true,
      prioritySupport: true
    },
    priceRUB: 0, // custom pricing
    priceUSD: 0
  }
}

// ============================================
// SUPER ADMIN (Platform-level)
// ============================================

export interface SuperAdmin {
  _id?: string | ObjectId
  id: string
  username?: string
  name?: string
  permissions: string[]
  createdAt: string
}

// ============================================
// TENANT ADMIN (per-tenant)
// ============================================

export type TenantAdminRole = 'owner' | 'admin' | 'moderator' | 'seller'

export interface TenantAdmin extends TenantScoped {
  _id?: string | ObjectId
  id: string              // Telegram user ID or custom ID
  username?: string       // Telegram username (for lookup)
  name?: string
  role: TenantAdminRole
  permissions?: string[]  // Optional custom permissions
  addedAt: string
  addedBy?: string
}

// ============================================
// TENANT-SCOPED ENTITIES
// ============================================

export interface Product extends TenantScoped {
  _id?: string | ObjectId
  name: string
  price: number
  oldPrice?: number
  images: string[]
  condition: 'new' | 'used'
  category: string
  description?: string
  inStock: boolean
  rating?: number
  createdAt?: string
  variants?: ProductVariant[]
  seller: {
    id: string
    name: string
    avatar?: string
    rating?: number
  }
  deliveryType?: DeliveryType
  deliveryKeys?: DeliveryKey[]
  deliveryInstructions?: string
  tags?: string[]
}

export interface Tag extends TenantScoped {
  _id?: string | ObjectId
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface ProductVariant {
  id: string
  name: string
  price: number
  period?: string
  description?: string
  features?: string[]
}

export interface DeliveryKey {
  id: string
  key: string
  variantId?: string
  isUsed: boolean
  usedByOrderId?: string
  usedAt?: string
  addedAt: string
}

export type DeliveryType = 'manual' | 'auto'

export interface PromoCode extends TenantScoped {
  _id?: string | ObjectId
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
  description?: string
  createdAt: string
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

export interface Order extends TenantScoped {
  _id?: string | ObjectId
  id: string
  oderId: string
  userId: string
  userName?: string
  userUsername?: string
  productId: string
  productName: string
  variantId?: string
  variantName?: string
  amount: number
  paymentMethod: 'cryptobot' | 'xrocket' | 'telegram-stars' | 'cactuspay-sbp' | 'cactuspay-card'
  paymentId?: string
  status: OrderStatus
  promoCode?: string
  deliveryData?: string | { iv: string; content: string; tag: string }
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

export interface User extends TenantScoped {
  _id?: string | ObjectId
  id: string
  name?: string
  username?: string
  avatar?: string
  referredBy?: string
  referralCode?: string
  referralCount?: number
  bonusBalance?: number
  createdAt: string
  lastSeen?: string
  isBlocked?: boolean
  blockReason?: string
  isPremium?: boolean
}

export interface Referral extends TenantScoped {
  _id?: string | ObjectId
  userId: string
  referrerId: string
  bonusAwarded: number
  createdAt: string
}

export interface Review extends TenantScoped {
  _id?: string | ObjectId
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  orderId?: string
  rating: number
  text: string
  createdAt: string
}

export interface SellerStats {
  totalOrders: number
  successfulOrders: number
  refundsCount: number
  disputesCount: number
  disputesLost: number
  replacementsCount: number
  totalRevenue: number
  averageDeliveryTime?: number
  lastOrderAt?: string
}

export interface SellerBalance {
  available: number
  frozen: number
  pendingWithdrawal: number
  totalWithdrawn: number
  totalEarned: number
}

export type SellerBadge = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky'

export interface Seller extends TenantScoped {
  _id?: string | ObjectId
  id: string
  name: string
  avatar?: string
  rating: number
  ratingCount: number
  createdAt: string
  stats: SellerStats
  balance: SellerBalance
  badges: SellerBadge[]
  escrowDays: number
  maxReplacementsPerOrder: number
  isVerified: boolean
  isBlocked: boolean
  blockReason?: string
}

export interface Chat extends TenantScoped {
  _id?: string | ObjectId
  id: string
  participants: string[]
  productId?: string
  productName?: string
  createdAt: string
  lastMessageAt?: string
}

export interface ChatMessage extends TenantScoped {
  _id?: string | ObjectId
  id?: string
  chatId: string
  senderId: string
  senderName?: string
  content: string
  messageType?: 'text' | 'image' | 'file'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isRead?: boolean
  createdAt: string
}

// Legacy Admin interface (now TenantAdmin)
export interface Admin extends TenantScoped {
  _id?: string | ObjectId
  id: string
  userId?: string
  username?: string
  name?: string
  addedAt: string
  addedBy?: string
}

export interface File extends TenantScoped {
  _id?: string | ObjectId
  id: string
  name: string
  type: string
  size: number
  data: string
  uploadedAt: string
  uploadedBy?: string
}

// Dispute system
export type DisputeStatus = 'open' | 'seller_response' | 'admin_review' | 'resolved' | 'rejected'
export type DisputeResolution = 'refund' | 'replacement' | 'partial_refund' | 'rejected' | 'buyer_fault'
export type DisputeReason = 'invalid_key' | 'not_delivered' | 'wrong_product' | 'other'

export interface DisputeMessage {
  id: string
  senderId: string
  senderType: 'buyer' | 'seller' | 'admin'
  senderName: string
  content: string
  attachments?: string[]
  createdAt: string
}

export interface Dispute extends TenantScoped {
  _id?: string | ObjectId
  id: string
  orderId: string
  productId: string
  productName: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  amount: number
  reason: DisputeReason
  description: string
  status: DisputeStatus
  resolution?: DisputeResolution
  resolutionNote?: string
  resolvedBy?: string
  resolvedAt?: string
  messages: DisputeMessage[]
  replacementKeyId?: string
  replacementCount: number
  createdAt: string
  updatedAt: string
  sellerResponseDeadline: string
  autoResolveAt?: string
}

export type EscrowStatus = 'frozen' | 'released' | 'refunded' | 'disputed'

export interface EscrowTransaction extends TenantScoped {
  _id?: string | ObjectId
  id: string
  orderId: string
  sellerId: string
  buyerId: string
  amount: number
  status: EscrowStatus
  frozenAt: string
  releaseAt: string
  releasedAt?: string
  refundedAt?: string
  disputeId?: string
  createdAt: string
}

export interface KeyReplacement extends TenantScoped {
  _id?: string | ObjectId
  id: string
  orderId: string
  productId: string
  sellerId: string
  buyerId: string
  originalKeyId: string
  replacementKeyId?: string
  reason: string
  status: 'pending' | 'replaced' | 'escalated' | 'rejected'
  disputeId?: string
  createdAt: string
  resolvedAt?: string
}

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'status_change' | 'deliver' | 'cancel' | 'refund'
  | 'add_keys' | 'remove_key' | 'restore'
  | 'dispute_open' | 'dispute_resolve' | 'dispute_escalate'
  | 'escrow_release' | 'escrow_refund'
  | 'key_replace' | 'seller_block' | 'seller_verify'
  | 'billing_upgrade' | 'billing_downgrade' | 'billing_payment'

export type AuditEntityType =
  | 'product' | 'order' | 'user' | 'seller'
  | 'admin' | 'promo_code' | 'review' | 'file' | 'backup'
  | 'dispute' | 'escrow' | 'key_replacement'
  | 'tenant' | 'billing'

export interface AuditLog extends TenantScoped {
  _id?: string | ObjectId
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  adminId: string
  adminName?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface SellerApplication extends TenantScoped {
  _id?: string | ObjectId
  id: string
  shopName: string
  category: string
  description: string
  telegram: string
  userId?: string
  userName?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNote?: string
}

// ============================================
// DATABASE CONNECTION
// ============================================

export async function connectDB(): Promise<Db> {
  if (db) return db

  try {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)

    await createIndexes(db)

    console.log('Connected to MongoDB:', DB_NAME)
    return db
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}

// Create indexes with tenant support
async function createIndexes(database: Db): Promise<void> {
  try {
    // ============================================
    // PLATFORM-LEVEL COLLECTIONS (no tenantId)
    // ============================================

    // Tenants
    await database.collection('tenants').createIndex({ id: 1 }, { unique: true })
    await database.collection('tenants').createIndex({ slug: 1 }, { unique: true })
    await database.collection('tenants').createIndex({ botToken: 1 }, { sparse: true, unique: true })
    await database.collection('tenants').createIndex({ status: 1 })

    // Super Admins
    await database.collection('superAdmins').createIndex({ id: 1 }, { unique: true })
    await database.collection('superAdmins').createIndex({ username: 1 }, { sparse: true })

    // Tenant Billing
    await database.collection('tenantBilling').createIndex({ tenantId: 1 }, { unique: true })
    await database.collection('tenantBilling').createIndex({ plan: 1 })
    await database.collection('tenantBilling').createIndex({ status: 1 })
    await database.collection('tenantBilling').createIndex({ 'subscription.nextBillingDate': 1 })

    // ============================================
    // TENANT-SCOPED COLLECTIONS (compound indexes with tenantId)
    // ============================================

    // Products
    await database.collection('products').createIndex({ tenantId: 1, _id: 1 })
    await database.collection('products').createIndex({ tenantId: 1, category: 1 })
    await database.collection('products').createIndex({ tenantId: 1, 'seller.id': 1 })
    await database.collection('products').createIndex({ tenantId: 1, tags: 1 })

    // Orders
    await database.collection('orders').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('orders').createIndex({ tenantId: 1, oderId: 1 })
    await database.collection('orders').createIndex({ tenantId: 1, userId: 1 })
    await database.collection('orders').createIndex({ tenantId: 1, status: 1 })
    await database.collection('orders').createIndex({ tenantId: 1, createdAt: -1 })
    await database.collection('orders').createIndex({ paymentId: 1 }) // For webhook lookup

    // Users
    await database.collection('users').createIndex({ tenantId: 1, id: 1 }, { unique: true })

    // Promo codes - drop old non-tenant-scoped index if exists
    try {
      await database.collection('promoCodes').dropIndex('code_1')
      console.log('Dropped old code_1 index from promoCodes')
    } catch (e) {
      // Index doesn't exist, that's fine
    }
    await database.collection('promoCodes').createIndex({ tenantId: 1, code: 1 }, { unique: true })

    // Chats
    await database.collection('chats').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('chats').createIndex({ tenantId: 1, participants: 1 })
    await database.collection('chatMessages').createIndex({ tenantId: 1, chatId: 1, createdAt: 1 })

    // Tenant Admins
    await database.collection('tenantAdmins').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('tenantAdmins').createIndex({ tenantId: 1, username: 1 }, { sparse: true })

    // Sellers
    await database.collection('sellers').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('sellers').createIndex({ tenantId: 1, rating: -1 })

    // Referrals
    await database.collection('referrals').createIndex({ tenantId: 1, userId: 1 }, { unique: true })
    await database.collection('referrals').createIndex({ tenantId: 1, referrerId: 1 })

    // Reviews
    await database.collection('reviews').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('reviews').createIndex({ tenantId: 1, productId: 1 })
    await database.collection('reviews').createIndex({ tenantId: 1, userId: 1 })

    // Audit logs
    await database.collection('auditLogs').createIndex({ tenantId: 1, timestamp: -1 })
    await database.collection('auditLogs').createIndex({ tenantId: 1, entityType: 1, entityId: 1 })
    await database.collection('auditLogs').createIndex({ tenantId: 1, adminId: 1 })

    // Tags
    await database.collection('tags').createIndex({ tenantId: 1, id: 1 }, { unique: true })

    // Disputes
    await database.collection('disputes').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('disputes').createIndex({ tenantId: 1, orderId: 1 })
    await database.collection('disputes').createIndex({ tenantId: 1, buyerId: 1 })
    await database.collection('disputes').createIndex({ tenantId: 1, sellerId: 1 })
    await database.collection('disputes').createIndex({ tenantId: 1, status: 1 })

    // Escrow
    await database.collection('escrow').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('escrow').createIndex({ tenantId: 1, orderId: 1 })
    await database.collection('escrow').createIndex({ tenantId: 1, sellerId: 1 })
    await database.collection('escrow').createIndex({ tenantId: 1, status: 1 })

    // Key replacements
    await database.collection('keyReplacements').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('keyReplacements').createIndex({ tenantId: 1, orderId: 1 })

    // Seller applications
    await database.collection('sellerApplications').createIndex({ tenantId: 1, id: 1 }, { unique: true })
    await database.collection('sellerApplications').createIndex({ tenantId: 1, status: 1 })

    // Files
    await database.collection('files').createIndex({ tenantId: 1, id: 1 }, { unique: true })

    console.log('Database indexes created')
  } catch (error) {
    console.error('Error creating indexes:', error)
  }
}

/**
 * Ensure default tenant exists (for backward compatibility)
 * Creates 'yehorshop' tenant if it doesn't exist
 */
export async function ensureDefaultTenant(): Promise<void> {
  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

  const existingTenant = await getTenantsCollection().findOne({ id: DEFAULT_TENANT_ID })

  if (!existingTenant) {
    console.log(`Creating default tenant: ${DEFAULT_TENANT_ID}`)

    const defaultTenant: Tenant = {
      id: DEFAULT_TENANT_ID,
      slug: DEFAULT_TENANT_ID,
      name: 'Yehor Shop',
      status: 'active',
      branding: {
        shopName: 'Yehor Shop',
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        welcomeMessage: 'Welcome to Yehor Shop!'
      },
      settings: {
        currency: 'RUB',
        language: 'ru',
        timezone: 'Europe/Moscow',
        enableReferrals: true,
        referralBonusAmount: 100,
        enableReviews: true,
        enableChat: true,
        autoDeliveryEnabled: true,
        requireEmailOnCheckout: false,
        notifyAdminsOnNewOrder: true,
        notifyOnPayment: true,
        notifyOnDelivery: true
      },
      commissionRules: {
        platformFeePercent: 5,
        minimumPayout: 1000,
        payoutSchedule: 'manual',
        escrowDaysDefault: 3
      },
      paymentConfig: {
        enabledMethods: ['cryptobot', 'cactuspay-sbp', 'cactuspay-card']
      },
      createdAt: new Date().toISOString(),
      activatedAt: new Date().toISOString()
    }

    await getTenantsCollection().insertOne(defaultTenant)
    console.log(`✅ Default tenant '${DEFAULT_TENANT_ID}' created`)
  } else {
    console.log(`✅ Default tenant '${DEFAULT_TENANT_ID}' exists`)
  }

  // Also ensure existing products have tenantId
  const productsWithoutTenant = await getProductsCollection().countDocuments({ tenantId: { $exists: false } })
  if (productsWithoutTenant > 0) {
    console.log(`Migrating ${productsWithoutTenant} products to tenant '${DEFAULT_TENANT_ID}'...`)
    await getProductsCollection().updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    )
    console.log(`✅ Products migrated to tenant '${DEFAULT_TENANT_ID}'`)
  }

  // Migrate or clean up promo codes without tenantId
  const promoCodesWithoutTenant = await getPromoCodesCollection().countDocuments({ tenantId: { $exists: false } })
  if (promoCodesWithoutTenant > 0) {
    console.log(`Migrating ${promoCodesWithoutTenant} promo codes to tenant '${DEFAULT_TENANT_ID}'...`)
    // Delete old codes without tenantId to avoid conflicts (they will be re-seeded with tenantId)
    await getPromoCodesCollection().deleteMany({ tenantId: { $exists: false } })
    console.log(`✅ Old promo codes cleaned up`)
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.')
  }
  return db
}

// ============================================
// COLLECTION GETTERS
// ============================================

// Platform-level collections
export function getTenantsCollection(): Collection<Tenant> {
  return getDB().collection<Tenant>('tenants')
}

export function getSuperAdminsCollection(): Collection<SuperAdmin> {
  return getDB().collection<SuperAdmin>('superAdmins')
}

export function getTenantBillingCollection(): Collection<TenantBilling> {
  return getDB().collection<TenantBilling>('tenantBilling')
}

// Tenant-scoped collections
export function getProductsCollection(): Collection<Product> {
  return getDB().collection<Product>('products')
}

export function getOrdersCollection(): Collection<Order> {
  return getDB().collection<Order>('orders')
}

export function getUsersCollection(): Collection<User> {
  return getDB().collection<User>('users')
}

export function getPromoCodesCollection(): Collection<PromoCode> {
  return getDB().collection<PromoCode>('promoCodes')
}

export function getSellersCollection(): Collection<Seller> {
  return getDB().collection<Seller>('sellers')
}

export function getChatsCollection(): Collection<Chat> {
  return getDB().collection<Chat>('chats')
}

export function getChatMessagesCollection(): Collection<ChatMessage> {
  return getDB().collection<ChatMessage>('chatMessages')
}

export function getTenantAdminsCollection(): Collection<TenantAdmin> {
  return getDB().collection<TenantAdmin>('tenantAdmins')
}

export function getAdminsCollection(): Collection<Admin> {
  return getDB().collection<Admin>('admins')
}

export function getFilesCollection(): Collection<File> {
  return getDB().collection<File>('files')
}

export function getAuditLogsCollection(): Collection<AuditLog> {
  return getDB().collection<AuditLog>('auditLogs')
}

export function getTagsCollection(): Collection<Tag> {
  return getDB().collection<Tag>('tags')
}

export function getReferralsCollection(): Collection<Referral> {
  return getDB().collection<Referral>('referrals')
}

export function getReviewsCollection(): Collection<Review> {
  return getDB().collection<Review>('reviews')
}

export function getDisputesCollection(): Collection<Dispute> {
  return getDB().collection<Dispute>('disputes')
}

export function getEscrowCollection(): Collection<EscrowTransaction> {
  return getDB().collection<EscrowTransaction>('escrow')
}

export function getKeyReplacementsCollection(): Collection<KeyReplacement> {
  return getDB().collection<KeyReplacement>('keyReplacements')
}

export function getSellerApplicationsCollection(): Collection<SellerApplication> {
  return getDB().collection<SellerApplication>('sellerApplications')
}

// Close connection
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('MongoDB connection closed')
  }
}

// ============================================
// TENANT LOOKUP FUNCTIONS
// ============================================

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  return await getTenantsCollection().findOne({ id: tenantId })
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return await getTenantsCollection().findOne({ slug })
}

/**
 * Get tenant by bot token
 */
export async function getTenantByBotToken(botToken: string): Promise<Tenant | null> {
  return await getTenantsCollection().findOne({ botToken, status: 'active' })
}

/**
 * Get tenant billing info
 */
export async function getTenantBilling(tenantId: string): Promise<TenantBilling | null> {
  return await getTenantBillingCollection().findOne({ tenantId })
}

/**
 * Check if tenant is within limits
 */
export async function checkTenantLimits(
  tenantId: string,
  resource: 'products' | 'orders' | 'sellers' | 'admins' | 'storage'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const billing = await getTenantBilling(tenantId)

  if (!billing) {
    return { allowed: false, current: 0, limit: 0 }
  }

  let current: number
  let limit: number

  switch (resource) {
    case 'products':
      current = billing.usage.productsCount
      limit = billing.limits.productsLimit
      break
    case 'orders':
      current = billing.usage.ordersThisMonth
      limit = billing.limits.ordersPerMonth
      break
    case 'sellers':
      current = billing.usage.sellersCount
      limit = billing.limits.sellersLimit
      break
    case 'admins':
      current = billing.usage.adminsCount
      limit = billing.limits.adminsLimit
      break
    case 'storage':
      current = billing.usage.storageUsedMB / 1024 // Convert to GB
      limit = billing.limits.storageGB
      break
  }

  // -1 means unlimited
  const allowed = limit === -1 || current < limit

  return { allowed, current, limit }
}

/**
 * Increment tenant usage counter
 */
export async function incrementTenantUsage(
  tenantId: string,
  resource: 'products' | 'orders' | 'sellers' | 'admins',
  delta: number = 1
): Promise<void> {
  const field = {
    products: 'usage.productsCount',
    orders: 'usage.ordersThisMonth',
    sellers: 'usage.sellersCount',
    admins: 'usage.adminsCount'
  }[resource]

  await getTenantBillingCollection().updateOne(
    { tenantId },
    {
      $inc: { [field]: delta },
      $set: { 'usage.lastUpdated': new Date().toISOString() }
    }
  )
}

// Helper to convert ObjectId to string
export function toClientDoc<T extends { _id?: string | ObjectId }>(doc: T): T {
  if (doc._id) {
    return { ...doc, _id: doc._id.toString() }
  }
  return doc
}

console.log('Database module loaded (multi-tenant with billing)')
