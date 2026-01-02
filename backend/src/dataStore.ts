import {
  getProductsCollection,
  getOrdersCollection,
  getUsersCollection,
  getPromoCodesCollection,
  getSellersCollection,
  getChatsCollection,
  getChatMessagesCollection,
  getAdminsCollection,
  getAuditLogsCollection,
  getTagsCollection,
  toClientDoc,
  Product,
  Order,
  OrderStatus,
  User,
  PromoCode,
  Seller,
  Chat,
  ChatMessage,
  Admin,
  AuditLog,
  AuditAction,
  AuditEntityType,
  Tag,
  incrementTenantUsage
} from './database'
import { ObjectId } from 'mongodb'
import { redis, CACHE_KEYS, CACHE_TTL } from './redis'

// Re-export types
export { Order, OrderStatus, Product, User, PromoCode, Seller, Chat, ChatMessage, Admin, AuditLog, AuditAction, AuditEntityType, Tag }

// Default tenant ID for backward compatibility during migration
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant-prefixed cache key
function tenantCacheKey(tenantId: string, key: string): string {
  return `tenant:${tenantId}:${key}`
}

// ============================================
// Products (Tenant-Scoped)
// ============================================

export async function loadProducts(tenantId?: string): Promise<Product[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const cacheKey = tenantCacheKey(tid, 'products')

  return redis.getOrSet(
    cacheKey,
    async () => {
      const products = await getProductsCollection().find({ tenantId: tid }).toArray()
      return products.map(p => toClientDoc(p))
    },
    CACHE_TTL.PRODUCTS
  )
}

export async function saveProducts(products: Product[], tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getProductsCollection()
  // Clear and insert all for this tenant (for bulk updates)
  await collection.deleteMany({ tenantId: tid })
  if (products.length > 0) {
    const productsWithTenant = products.map(p => ({ ...p, tenantId: tid }))
    await collection.insertMany(productsWithTenant)
  }
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'products'))
}

export async function getProductById(productId: string, tenantId?: string): Promise<Product | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const cacheKey = tenantCacheKey(tid, `product:${productId}`)

  return redis.getOrSet(
    cacheKey,
    async () => {
      const collection = getProductsCollection()
      let product: Product | null = null

      // Try as ObjectId first
      if (ObjectId.isValid(productId)) {
        product = await collection.findOne({ tenantId: tid, _id: new ObjectId(productId) as any })
      }

      // Try as string _id
      if (!product) {
        product = await collection.findOne({ tenantId: tid, _id: productId as any })
      }

      return product ? toClientDoc(product) : null
    },
    CACHE_TTL.PRODUCT
  )
}

export async function addProduct(product: Product, tenantId?: string): Promise<Product> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getProductsCollection()
  const productWithTenant = { ...product, tenantId: tid }
  const result = await collection.insertOne(productWithTenant as any)

  // Track usage for billing
  await incrementTenantUsage(tid, 'products', 1)

  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'products'))
  return { ...productWithTenant, _id: result.insertedId.toString() }
}

export async function updateProduct(productId: string, updates: Partial<Product>, tenantId?: string): Promise<Product | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getProductsCollection()
  let filter: any = { tenantId: tid }

  if (ObjectId.isValid(productId)) {
    filter._id = new ObjectId(productId)
  } else {
    filter._id = productId
  }

  const result = await collection.findOneAndUpdate(
    filter,
    { $set: updates },
    { returnDocument: 'after' }
  )

  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'products'))
  await redis.del(tenantCacheKey(tid, `product:${productId}`))

  return result ? toClientDoc(result) : null
}

export async function deleteProduct(productId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getProductsCollection()
  const filter: any = { tenantId: tid }

  if (ObjectId.isValid(productId)) {
    filter._id = new ObjectId(productId)
  } else {
    filter._id = productId
  }

  const result = await collection.deleteOne(filter)

  if (result.deletedCount > 0) {
    // Track usage for billing
    await incrementTenantUsage(tid, 'products', -1)
  }

  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'products'))
  await redis.del(tenantCacheKey(tid, `product:${productId}`))

  return result.deletedCount > 0
}

export async function getProductsByCategory(category: string, tenantId?: string): Promise<Product[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const products = await getProductsCollection().find({ tenantId: tid, category }).toArray()
  return products.map(p => toClientDoc(p))
}

export async function getProductsBySeller(sellerId: string, tenantId?: string): Promise<Product[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const products = await getProductsCollection().find({ tenantId: tid, 'seller.id': sellerId }).toArray()
  return products.map(p => toClientDoc(p))
}

// ============================================
// Promo Codes (Tenant-Scoped)
// ============================================

export async function loadPromoCodes(tenantId?: string): Promise<PromoCode[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const cacheKey = tenantCacheKey(tid, 'promo_codes')

  return redis.getOrSet(
    cacheKey,
    async () => {
      const codes = await getPromoCodesCollection().find({ tenantId: tid }).toArray()
      return codes.map(c => toClientDoc(c))
    },
    CACHE_TTL.PROMO_CODES
  )
}

export async function savePromoCodes(promoCodes: PromoCode[], tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getPromoCodesCollection()

  // Use bulkWrite with upsert to handle existing codes gracefully
  if (promoCodes.length > 0) {
    const operations = promoCodes.map(c => ({
      updateOne: {
        filter: { tenantId: tid, code: c.code.toUpperCase() },
        update: { $setOnInsert: { ...c, tenantId: tid, code: c.code.toUpperCase() } },
        upsert: true
      }
    }))
    await collection.bulkWrite(operations)
  }
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'promo_codes'))
}

export async function getPromoByCode(code: string, tenantId?: string): Promise<PromoCode | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const cacheKey = tenantCacheKey(tid, `promo:${code.toUpperCase()}`)

  return redis.getOrSet(
    cacheKey,
    async () => {
      const promo = await getPromoCodesCollection().findOne({ tenantId: tid, code: code.toUpperCase() })
      return promo ? toClientDoc(promo) : null
    },
    CACHE_TTL.PROMO_CODES
  )
}

export async function addPromoCode(promo: PromoCode, tenantId?: string): Promise<PromoCode> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getPromoCodesCollection()
  const promoWithTenant = { ...promo, tenantId: tid }
  const result = await collection.insertOne(promoWithTenant as any)
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'promo_codes'))
  return { ...promoWithTenant, _id: result.insertedId.toString() }
}

export async function updatePromoCode(code: string, updates: Partial<PromoCode>, tenantId?: string): Promise<PromoCode | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getPromoCodesCollection().findOneAndUpdate(
    { tenantId: tid, code: code.toUpperCase() },
    { $set: updates },
    { returnDocument: 'after' }
  )
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'promo_codes'))
  await redis.del(tenantCacheKey(tid, `promo:${code.toUpperCase()}`))
  return result ? toClientDoc(result) : null
}

export async function incrementPromoUsage(code: string, tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  await getPromoCodesCollection().updateOne(
    { tenantId: tid, code: code.toUpperCase() },
    { $inc: { usedCount: 1 } }
  )
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, `promo:${code.toUpperCase()}`))
}

export async function deletePromoCode(code: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getPromoCodesCollection().deleteOne({ tenantId: tid, code: code.toUpperCase() })
  // Invalidate cache
  await redis.del(tenantCacheKey(tid, 'promo_codes'))
  await redis.del(tenantCacheKey(tid, `promo:${code.toUpperCase()}`))
  return result.deletedCount > 0
}

// ============================================
// Orders (Tenant-Scoped)
// ============================================

export async function loadOrders(tenantId?: string): Promise<Order[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const orders = await getOrdersCollection()
    .find({ tenantId: tid })
    .sort({ createdAt: -1 })
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function saveOrders(orders: Order[], tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getOrdersCollection()
  await collection.deleteMany({ tenantId: tid })
  if (orders.length > 0) {
    const ordersWithTenant = orders.map(o => ({ ...o, tenantId: tid }))
    await collection.insertMany(ordersWithTenant)
  }
}

export async function addOrder(order: Order, tenantId?: string): Promise<Order> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getOrdersCollection()
  const orderWithTenant = { ...order, tenantId: tid }
  const result = await collection.insertOne(orderWithTenant as any)

  // Track usage for billing
  await incrementTenantUsage(tid, 'orders', 1)

  return { ...orderWithTenant, _id: result.insertedId.toString() }
}

export async function updateOrder(orderId: string, updates: Partial<Order>, tenantId?: string): Promise<Order | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getOrdersCollection().findOneAndUpdate(
    { tenantId: tid, id: orderId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function getOrderById(orderId: string, tenantId?: string): Promise<Order | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const order = await getOrdersCollection().findOne({ tenantId: tid, id: orderId })
  return order ? toClientDoc(order) : null
}

export async function getOrderByExternalId(oderId: string, tenantId?: string): Promise<Order | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const order = await getOrdersCollection().findOne({ tenantId: tid, oderId })
  return order ? toClientDoc(order) : null
}

export async function getOrdersByUserId(userId: string, tenantId?: string, limit = 50, offset = 0): Promise<Order[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const orders = await getOrdersCollection()
    .find({ tenantId: tid, userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function getOrdersByStatus(status: OrderStatus, tenantId?: string, limit = 50, offset = 0): Promise<Order[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const orders = await getOrdersCollection()
    .find({ tenantId: tid, status })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function getOrdersWithFilters(
  filters: { status?: OrderStatus; userId?: string },
  limit = 50,
  offset = 0,
  tenantId?: string
): Promise<Order[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const query: any = { tenantId: tid }
  if (filters.status) query.status = filters.status
  if (filters.userId) query.userId = filters.userId

  const orders = await getOrdersCollection()
    .find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return orders.map(o => toClientDoc(o))
}

export async function countOrders(filters?: { status?: OrderStatus; userId?: string }, tenantId?: string): Promise<number> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const query: any = { tenantId: tid }
  if (filters?.status) query.status = filters.status
  if (filters?.userId) query.userId = filters.userId
  return getOrdersCollection().countDocuments(query)
}

// ============================================
// Users (Tenant-Scoped)
// ============================================

export async function loadUsers(tenantId?: string): Promise<User[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const users = await getUsersCollection().find({ tenantId: tid }).toArray()
  return users.map(u => toClientDoc(u))
}

export async function saveUsers(users: User[], tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getUsersCollection()
  await collection.deleteMany({ tenantId: tid })
  if (users.length > 0) {
    const usersWithTenant = users.map(u => ({ ...u, tenantId: tid }))
    await collection.insertMany(usersWithTenant)
  }
}

export async function getUserById(userId: string, tenantId?: string): Promise<User | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const user = await getUsersCollection().findOne({ tenantId: tid, id: userId })
  return user ? toClientDoc(user) : null
}

export async function addUser(user: User, tenantId?: string): Promise<User> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getUsersCollection()
  const userWithTenant = { ...user, tenantId: tid }
  const result = await collection.insertOne(userWithTenant as any)
  return { ...userWithTenant, _id: result.insertedId.toString() }
}

export async function updateUser(userId: string, updates: Partial<User>, tenantId?: string): Promise<User | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getUsersCollection().findOneAndUpdate(
    { tenantId: tid, id: userId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function upsertUser(user: User, tenantId?: string): Promise<User> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getUsersCollection().findOneAndUpdate(
    { tenantId: tid, id: user.id },
    {
      $set: { ...user, tenantId: tid, lastSeen: new Date().toISOString() },
      $setOnInsert: { createdAt: user.createdAt || new Date().toISOString() }
    },
    { upsert: true, returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : { ...user, tenantId: tid }
}

export async function countUsers(tenantId?: string): Promise<number> {
  const tid = tenantId || DEFAULT_TENANT_ID
  return getUsersCollection().countDocuments({ tenantId: tid })
}

// ============================================
// Sellers (Tenant-Scoped)
// ============================================

export async function loadSellers(tenantId?: string): Promise<Seller[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const sellers = await getSellersCollection().find({ tenantId: tid }).toArray()
  return sellers.map(s => toClientDoc(s))
}

export async function getSellerById(sellerId: string, tenantId?: string): Promise<Seller | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const seller = await getSellersCollection().findOne({ tenantId: tid, id: sellerId })
  return seller ? toClientDoc(seller) : null
}

export async function addSeller(seller: Seller, tenantId?: string): Promise<Seller> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getSellersCollection()
  const sellerWithTenant = { ...seller, tenantId: tid }
  const result = await collection.insertOne(sellerWithTenant as any)

  // Track usage for billing
  await incrementTenantUsage(tid, 'sellers', 1)

  return { ...sellerWithTenant, _id: result.insertedId.toString() }
}

export async function updateSeller(sellerId: string, updates: Partial<Seller>, tenantId?: string): Promise<Seller | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getSellersCollection().findOneAndUpdate(
    { tenantId: tid, id: sellerId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

// ============================================
// Chats (Tenant-Scoped)
// ============================================

export async function loadChats(tenantId?: string): Promise<Chat[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const chats = await getChatsCollection()
    .find({ tenantId: tid })
    .sort({ lastMessageAt: -1 })
    .toArray()
  return chats.map(c => toClientDoc(c))
}

export async function getChatById(chatId: string, tenantId?: string): Promise<Chat | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const chat = await getChatsCollection().findOne({ tenantId: tid, id: chatId })
  return chat ? toClientDoc(chat) : null
}

export async function getChatsByUserId(userId: string, tenantId?: string): Promise<Chat[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const chats = await getChatsCollection()
    .find({ tenantId: tid, participants: userId })
    .sort({ lastMessageAt: -1 })
    .toArray()
  return chats.map(c => toClientDoc(c))
}

export async function addChat(chat: Chat, tenantId?: string): Promise<Chat> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getChatsCollection()
  const chatWithTenant = { ...chat, tenantId: tid }
  const result = await collection.insertOne(chatWithTenant as any)
  return { ...chatWithTenant, _id: result.insertedId.toString() }
}

export async function updateChatLastMessage(chatId: string, tenantId?: string): Promise<void> {
  const tid = tenantId || DEFAULT_TENANT_ID
  await getChatsCollection().updateOne(
    { tenantId: tid, id: chatId },
    { $set: { lastMessageAt: new Date().toISOString() } }
  )
}

// ============================================
// Chat Messages (Tenant-Scoped)
// ============================================

export async function getChatMessages(chatId: string, tenantId?: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const messages = await getChatMessagesCollection()
    .find({ tenantId: tid, chatId })
    .sort({ createdAt: 1 })
    .skip(offset)
    .limit(limit)
    .toArray()
  return messages.map(m => toClientDoc(m))
}

export async function addChatMessage(message: ChatMessage, tenantId?: string): Promise<ChatMessage> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getChatMessagesCollection()
  const messageWithTenant = { ...message, tenantId: tid }
  const result = await collection.insertOne(messageWithTenant as any)
  // Update chat last message time
  await updateChatLastMessage(message.chatId, tid)
  return { ...messageWithTenant, _id: result.insertedId.toString() }
}

// ============================================
// Statistics (Tenant-Scoped)
// ============================================

export async function getOrderStats(tenantId?: string): Promise<{
  total: number
  pending: number
  paid: number
  delivered: number
  cancelled: number
  totalRevenue: number
}> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const [total, pending, paid, delivered, cancelled] = await Promise.all([
    getOrdersCollection().countDocuments({ tenantId: tid }),
    getOrdersCollection().countDocuments({ tenantId: tid, status: 'pending' }),
    getOrdersCollection().countDocuments({ tenantId: tid, status: 'paid' }),
    getOrdersCollection().countDocuments({ tenantId: tid, status: 'delivered' }),
    getOrdersCollection().countDocuments({ tenantId: tid, status: 'cancelled' })
  ])

  // Calculate total revenue from paid/delivered orders
  const revenueResult = await getOrdersCollection().aggregate([
    { $match: { tenantId: tid, status: { $in: ['paid', 'delivered'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray()

  const totalRevenue = revenueResult[0]?.total || 0

  return { total, pending, paid, delivered, cancelled, totalRevenue }
}

// ============================================
// Admins (Tenant-Scoped)
// ============================================

export async function loadAdmins(tenantId?: string): Promise<Admin[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const admins = await getAdminsCollection().find({ tenantId: tid }).toArray()
  return admins.map(a => toClientDoc(a))
}

export async function getAdminById(adminId: string, tenantId?: string): Promise<Admin | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const admin = await getAdminsCollection().findOne({ tenantId: tid, id: adminId })
  return admin ? toClientDoc(admin) : null
}

export async function getAdminByUserId(userId: string, tenantId?: string): Promise<Admin | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const admin = await getAdminsCollection().findOne({ tenantId: tid, userId })
  return admin ? toClientDoc(admin) : null
}

export async function getAdminByUsername(username: string, tenantId?: string): Promise<Admin | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const admin = await getAdminsCollection().findOne({ tenantId: tid, username: username.toLowerCase() })
  return admin ? toClientDoc(admin) : null
}

export async function addAdmin(admin: Admin, tenantId?: string): Promise<Admin> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getAdminsCollection()
  const adminWithTenant = { ...admin, tenantId: tid }
  const result = await collection.insertOne(adminWithTenant as any)

  // Track usage for billing
  await incrementTenantUsage(tid, 'admins', 1)

  return { ...adminWithTenant, _id: result.insertedId.toString() }
}

export async function deleteAdmin(adminId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getAdminsCollection().deleteOne({ tenantId: tid, id: adminId })

  if (result.deletedCount > 0) {
    // Track usage for billing
    await incrementTenantUsage(tid, 'admins', -1)
  }

  return result.deletedCount > 0
}

export async function isUserAdmin(userId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const admin = await getAdminsCollection().findOne({ tenantId: tid, userId })
  return !!admin
}

// ============================================
// Sellers Enhanced (Tenant-Scoped)
// ============================================

export async function deleteSeller(sellerId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getSellersCollection().deleteOne({ tenantId: tid, id: sellerId })

  if (result.deletedCount > 0) {
    // Track usage for billing
    await incrementTenantUsage(tid, 'sellers', -1)
  }

  return result.deletedCount > 0
}

// ============================================
// Files (Tenant-Scoped)
// ============================================

import { getFilesCollection, File as UploadedFile } from './database'

export { UploadedFile }

export async function getFiles(tenantId?: string): Promise<UploadedFile[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const files = await getFilesCollection().find({ tenantId: tid }).sort({ uploadedAt: -1 }).toArray()
  return files.map(f => toClientDoc(f))
}

export async function getFileById(fileId: string, tenantId?: string): Promise<UploadedFile | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const file = await getFilesCollection().findOne({ tenantId: tid, id: fileId })
  return file ? toClientDoc(file) : null
}

export async function saveFile(file: UploadedFile, tenantId?: string): Promise<UploadedFile> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getFilesCollection()
  const fileWithTenant = { ...file, tenantId: tid }
  const result = await collection.insertOne(fileWithTenant as any)
  return { ...fileWithTenant, _id: result.insertedId.toString() }
}

export async function deleteFile(fileId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getFilesCollection().deleteOne({ tenantId: tid, id: fileId })
  return result.deletedCount > 0
}

// ============================================
// Audit Logs (Tenant-Scoped)
// ============================================

export interface AuditLogFilters {
  action?: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  adminId?: string
  startDate?: string
  endDate?: string
}

export interface LogAdminActionParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  adminId: string
  adminName?: string
  tenantId?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<AuditLog> {
  const tid = params.tenantId || DEFAULT_TENANT_ID
  const auditLog: AuditLog = {
    tenantId: tid,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    adminId: params.adminId,
    adminName: params.adminName,
    changes: params.changes,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    timestamp: new Date().toISOString()
  }

  const collection = getAuditLogsCollection()
  const result = await collection.insertOne(auditLog as any)
  return { ...auditLog, _id: result.insertedId.toString() }
}

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  limit = 50,
  offset = 0,
  tenantId?: string
): Promise<{ logs: AuditLog[]; total: number }> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getAuditLogsCollection()
  const query: any = { tenantId: tid }

  if (filters.action) query.action = filters.action
  if (filters.entityType) query.entityType = filters.entityType
  if (filters.entityId) query.entityId = filters.entityId
  if (filters.adminId) query.adminId = filters.adminId

  // Date range filtering
  if (filters.startDate || filters.endDate) {
    query.timestamp = {}
    if (filters.startDate) query.timestamp.$gte = filters.startDate
    if (filters.endDate) query.timestamp.$lte = filters.endDate
  }

  const [logs, total] = await Promise.all([
    collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query)
  ])

  return {
    logs: logs.map(log => toClientDoc(log)),
    total
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsByEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50,
  offset = 0,
  tenantId?: string
): Promise<{ logs: AuditLog[]; total: number }> {
  return getAuditLogs({ entityType, entityId }, limit, offset, tenantId)
}

/**
 * Get audit logs by admin
 */
export async function getAuditLogsByAdmin(
  adminId: string,
  limit = 50,
  offset = 0,
  tenantId?: string
): Promise<{ logs: AuditLog[]; total: number }> {
  return getAuditLogs({ adminId }, limit, offset, tenantId)
}

/**
 * Count total audit logs (optionally with filters)
 */
export async function countAuditLogs(filters: AuditLogFilters = {}, tenantId?: string): Promise<number> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getAuditLogsCollection()
  const query: any = { tenantId: tid }

  if (filters.action) query.action = filters.action
  if (filters.entityType) query.entityType = filters.entityType
  if (filters.entityId) query.entityId = filters.entityId
  if (filters.adminId) query.adminId = filters.adminId

  if (filters.startDate || filters.endDate) {
    query.timestamp = {}
    if (filters.startDate) query.timestamp.$gte = filters.startDate
    if (filters.endDate) query.timestamp.$lte = filters.endDate
  }

  return collection.countDocuments(query)
}

/**
 * Delete old audit logs (for cleanup)
 */
export async function deleteOldAuditLogs(olderThanDays: number, tenantId?: string): Promise<number> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getAuditLogsCollection()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await collection.deleteMany({
    tenantId: tid,
    timestamp: { $lt: cutoffDate.toISOString() }
  })

  return result.deletedCount
}

// ============================================
// Tags (Tenant-Scoped)
// ============================================

export async function loadTags(tenantId?: string): Promise<Tag[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const tags = await getTagsCollection().find({ tenantId: tid }).sort({ name: 1 }).toArray()
  return tags.map(t => toClientDoc(t))
}

export async function getTagById(tagId: string, tenantId?: string): Promise<Tag | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const tag = await getTagsCollection().findOne({ tenantId: tid, id: tagId })
  return tag ? toClientDoc(tag) : null
}

export async function getTagByName(name: string, tenantId?: string): Promise<Tag | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const tag = await getTagsCollection().findOne({ tenantId: tid, name: { $regex: new RegExp(`^${name}$`, 'i') } })
  return tag ? toClientDoc(tag) : null
}

export async function addTag(tag: Tag, tenantId?: string): Promise<Tag> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const collection = getTagsCollection()
  const tagWithTenant = { ...tag, tenantId: tid }
  const result = await collection.insertOne(tagWithTenant as any)
  return { ...tagWithTenant, _id: result.insertedId.toString() }
}

export async function updateTag(tagId: string, updates: Partial<Tag>, tenantId?: string): Promise<Tag | null> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getTagsCollection().findOneAndUpdate(
    { tenantId: tid, id: tagId },
    { $set: updates },
    { returnDocument: 'after' }
  )
  return result ? toClientDoc(result) : null
}

export async function deleteTag(tagId: string, tenantId?: string): Promise<boolean> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const result = await getTagsCollection().deleteOne({ tenantId: tid, id: tagId })

  // Also remove this tag from all products in this tenant that have it
  if (result.deletedCount > 0) {
    await getProductsCollection().updateMany(
      { tenantId: tid, tags: tagId },
      { $pull: { tags: tagId } as any }
    )
    // Invalidate products cache
    await redis.del(tenantCacheKey(tid, 'products'))
  }

  return result.deletedCount > 0
}

export async function getProductsByTag(tagId: string, tenantId?: string): Promise<Product[]> {
  const tid = tenantId || DEFAULT_TENANT_ID
  const products = await getProductsCollection().find({ tenantId: tid, tags: tagId }).toArray()
  return products.map(p => toClientDoc(p))
}

export async function countProductsByTag(tagId: string, tenantId?: string): Promise<number> {
  const tid = tenantId || DEFAULT_TENANT_ID
  return getProductsCollection().countDocuments({ tenantId: tid, tags: tagId })
}

console.log('DataStore module loaded (MongoDB - Multi-tenant)')
