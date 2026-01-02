import { FastifyInstance, FastifyRequest } from 'fastify'
import { adminMiddleware } from '../auth'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import {
  validateBody,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  createPromoSchema,
  updatePromoSchema,
  createSellerSchema,
  updateSellerSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  deliverOrderSchema
} from '../validation'
import {
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  addPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPromoByCode,
  getOrdersWithFilters,
  countOrders,
  getOrderStats,
  getOrderById,
  updateOrder,
  loadAdmins,
  addAdmin,
  deleteAdmin,
  getAdminById,
  getAdminByUserId,
  getAdminByUsername,
  loadSellers,
  addSeller,
  updateSeller,
  deleteSeller,
  getSellerById,
  loadTags,
  getTagById,
  getTagByName,
  addTag,
  updateTag,
  deleteTag,
  countProductsByTag,
  Order,
  OrderStatus,
  Admin,
  Tag,
  logAdminAction,
  getAuditLogs,
  getAuditLogsByEntity,
  AuditAction,
  AuditEntityType
} from '../dataStore'
import { getUsersCollection, getOrdersCollection } from '../database'
import { createBackup, restoreFromBackup, getBackupStats, validateBackup } from '../backup'
import { addDeliveryKeys, removeDeliveryKey, getDeliveryStats } from '../delivery'

declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
    promoCodes: any[]
  }
}

// Helper to extract admin info from request for audit logging
function getAdminInfo(request: any): { adminId: string; adminName?: string; ipAddress?: string; userAgent?: string; tenantId: string } {
  const user = request.user || {}
  return {
    adminId: user.userId || 'unknown',
    adminName: user.username || undefined,
    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
    userAgent: request.headers['user-agent'] || undefined,
    tenantId: reqTenantId(request) // SECURITY: Always include tenant context in audit logs
  }
}

// Helper to sanitize object for logging (remove sensitive/large data)
function sanitizeForLog(obj: any): any {
  if (!obj) return obj
  const sanitized = { ...obj }
  // Remove large fields like base64 data
  if (sanitized.data && typeof sanitized.data === 'string' && sanitized.data.length > 100) {
    sanitized.data = `[base64 data, ${sanitized.data.length} chars]`
  }
  if (sanitized.deliveryKeys && Array.isArray(sanitized.deliveryKeys)) {
    sanitized.deliveryKeys = `[${sanitized.deliveryKeys.length} keys]`
  }
  return sanitized
}

export async function adminRoutes(fastify: FastifyInstance) {
  // ============================================
  // PRODUCTS MANAGEMENT
  // ============================================

  // Create product
  fastify.post('/admin/products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const product = validateBody(createProductSchema, request.body)
      const newProduct = {
        ...product,
        _id: product._id || String(Date.now()),
        createdAt: new Date().toISOString(),
        inStock: true
      }
      const saved = await addProduct(newProduct as any, reqTenantId(request))
      fastify.products.unshift(saved)

      // Log the action (tenantId included via getAdminInfo)
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'product',
        entityId: saved._id?.toString() || newProduct._id,
        changes: { after: sanitizeForLog(saved) }
      })

      return { success: true, product: saved }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update product
  fastify.put('/admin/products/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const updates = validateBody(updateProductSchema, request.body)

      // Get product before update for audit log
      const before = await getProductById(id, reqTenantId(request))

      const updated = await updateProduct(id, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }
      const index = fastify.products.findIndex(p => p._id === id)
      if (index !== -1) fastify.products[index] = updated

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'product',
        entityId: id,
        changes: {
          before: sanitizeForLog(before),
          after: sanitizeForLog(updated)
        }
      })

      return { success: true, product: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete product
  fastify.delete('/admin/products/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get product before deletion for audit log
    const before = await getProductById(id, reqTenantId(request))

    const deleted = await deleteProduct(id, reqTenantId(request))
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Product not found' }
    }
    const index = fastify.products.findIndex(p => p._id === id)
    if (index !== -1) fastify.products.splice(index, 1)

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'product',
      entityId: id,
      changes: { before: sanitizeForLog(before) }
    })

    return { success: true }
  })

  // ============================================
  // DELIVERY KEYS MANAGEMENT
  // ============================================

  // Get delivery stats for a product
  fastify.get('/admin/products/:id/delivery', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const stats = await getDeliveryStats(id)
      const product = fastify.products.find(p => p._id === id)

      return {
        success: true,
        stats,
        deliveryType: product?.deliveryType || 'manual',
        deliveryInstructions: product?.deliveryInstructions,
        keys: product?.deliveryKeys?.map((k: any) => ({
          id: k.id,
          key: k.isUsed ? '***' : k.key,
          variantId: k.variantId,
          isUsed: k.isUsed,
          usedByOrderId: k.usedByOrderId,
          usedAt: k.usedAt,
          addedAt: k.addedAt
        })) || []
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Add delivery keys to a product
  fastify.post('/admin/products/:id/delivery/keys', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { keys, variantId } = request.body as { keys: string[]; variantId?: string }

      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        reply.code(400)
        return { success: false, error: 'Keys array is required' }
      }

      // Filter out empty keys
      const validKeys = keys.map(k => k.trim()).filter(k => k.length > 0)

      if (validKeys.length === 0) {
        reply.code(400)
        return { success: false, error: 'No valid keys provided' }
      }

      const addedKeys = await addDeliveryKeys(id, validKeys, variantId)

      // Update local cache
      const product = fastify.products.find(p => p._id === id)
      if (product) {
        if (!product.deliveryKeys) product.deliveryKeys = []
        product.deliveryKeys.push(...addedKeys)
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'add_keys',
        entityType: 'product',
        entityId: id,
        metadata: {
          keysAdded: addedKeys.length,
          variantId
        }
      })

      return {
        success: true,
        addedCount: addedKeys.length,
        keys: addedKeys
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Remove a delivery key
  fastify.delete('/admin/products/:id/delivery/keys/:keyId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id, keyId } = request.params as any

      const deleted = await removeDeliveryKey(id, keyId)

      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Key not found' }
      }

      // Update local cache
      const product = fastify.products.find(p => p._id === id)
      if (product && product.deliveryKeys) {
        product.deliveryKeys = product.deliveryKeys.filter((k: any) => k.id !== keyId)
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'remove_key',
        entityType: 'product',
        entityId: id,
        metadata: { keyId }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update delivery settings for a product
  fastify.put('/admin/products/:id/delivery', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { deliveryType, deliveryInstructions } = request.body as {
        deliveryType?: 'manual' | 'auto'
        deliveryInstructions?: string
      }

      // Get product before update for audit log
      const before = await getProductById(id, reqTenantId(request))

      const updates: any = {}
      if (deliveryType !== undefined) updates.deliveryType = deliveryType
      if (deliveryInstructions !== undefined) updates.deliveryInstructions = deliveryInstructions

      const updated = await updateProduct(id, updates, reqTenantId(request))

      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Product not found' }
      }

      // Update local cache
      const product = fastify.products.find(p => p._id === id)
      if (product) {
        Object.assign(product, updates)
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'product',
        entityId: id,
        changes: {
          before: { deliveryType: before?.deliveryType, deliveryInstructions: before?.deliveryInstructions },
          after: updates
        },
        metadata: { field: 'delivery_settings' }
      })

      return { success: true, product: updated }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // SELLERS MANAGEMENT
  // ============================================

  // Sync sellers from products to sellers collection
  // This ensures sellers embedded in products appear in the sellers list
  async function syncSellersFromProducts(tenantId: string): Promise<number> {
    const { loadProducts } = await import('../dataStore')
    const { getSellersCollection } = await import('../database')

    const products = await loadProducts(tenantId)
    const existingSellers = await loadSellers(tenantId)
    const existingSellerIds = new Set(existingSellers.map(s => s.id))

    let syncedCount = 0

    // Collect unique sellers from products
    const sellersFromProducts = new Map<string, any>()
    for (const product of products) {
      if (product.seller && product.seller.id && !existingSellerIds.has(product.seller.id)) {
        if (!sellersFromProducts.has(product.seller.id)) {
          sellersFromProducts.set(product.seller.id, product.seller)
        }
      }
    }

    // Add or update missing sellers using upsert
    const collection = getSellersCollection()
    for (const [sellerId, sellerData] of sellersFromProducts) {
      try {
        const sellerDoc = {
          id: sellerId,
          name: sellerData.name || 'Unknown',
          avatar: sellerData.avatar || '',
          rating: sellerData.rating || 5,
          ratingCount: 0,
          createdAt: new Date().toISOString(),
          stats: {
            totalOrders: 0,
            successfulOrders: 0,
            refundsCount: 0,
            disputesCount: 0,
            disputesLost: 0,
            replacementsCount: 0,
            totalRevenue: 0
          },
          balance: {
            available: 0,
            frozen: 0,
            pendingWithdrawal: 0,
            totalWithdrawn: 0,
            totalEarned: 0
          },
          badges: ['new'] as ('new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky')[],
          escrowDays: 3,
          maxReplacementsPerOrder: 2,
          isVerified: sellerData.isVerified || false,
          isBlocked: false,
          tenantId
        }
        // Use upsert to handle sellers with wrong/missing tenantId
        const result = await collection.updateOne(
          { id: sellerId },
          {
            $set: { tenantId, name: sellerDoc.name, avatar: sellerDoc.avatar },
            $setOnInsert: sellerDoc
          },
          { upsert: true }
        )
        if (result.upsertedCount > 0 || result.modifiedCount > 0) {
          syncedCount++
        }
      } catch (e: any) {
        console.error(`Error syncing seller ${sellerId}:`, e.message)
      }
    }

    return syncedCount
  }

  // Get all sellers (with auto-sync from products)
  fastify.get('/admin/sellers', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)

      // First, sync any missing sellers from products
      const syncedCount = await syncSellersFromProducts(tenantId)
      if (syncedCount > 0) {
        console.log(`[Admin] Synced ${syncedCount} sellers from products to sellers collection`)
      }

      const sellers = await loadSellers(tenantId)
      return { success: true, sellers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Manual sync endpoint
  fastify.post('/admin/sellers/sync', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)
      const syncedCount = await syncSellersFromProducts(tenantId)
      return { success: true, syncedCount }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Fix sellers tenantId - updates all sellers without correct tenantId
  fastify.post('/admin/sellers/fix-tenant', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tenantId = reqTenantId(request)
      const { getSellersCollection } = await import('../database')
      const collection = getSellersCollection()

      // Update all sellers that don't have the correct tenantId
      const result = await collection.updateMany(
        { $or: [{ tenantId: { $ne: tenantId } }, { tenantId: { $exists: false } }] },
        { $set: { tenantId } }
      )

      return { success: true, modifiedCount: result.modifiedCount }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Create seller
  fastify.post('/admin/sellers', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const sellerData = validateBody(createSellerSchema, request.body)
      const seller = await addSeller({
        ...sellerData,
        id: sellerData.id || String(Date.now()),
        createdAt: new Date().toISOString()
      } as any, reqTenantId(request))

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'seller',
        entityId: seller.id,
        changes: { after: seller }
      })

      return { success: true, seller }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update seller
  fastify.put('/admin/sellers/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const updates = validateBody(updateSellerSchema, request.body)

      // Get seller before update for audit log
      const before = await getSellerById(id, reqTenantId(request))

      const updated = await updateSeller(id, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Seller not found' }
      }
      // Also update seller info in products
      const { loadProducts } = await import('../dataStore')
      const products = await loadProducts(reqTenantId(request))
      for (const p of products) {
        if (p.seller && p.seller.id === id && p._id) {
          const updatedProductSeller = { ...p.seller, ...updates }
          await updateProduct(String(p._id), { seller: updatedProductSeller }, reqTenantId(request))
        }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'seller',
        entityId: id,
        changes: { before: before || undefined, after: updated || undefined }
      })

      return { success: true, seller: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete seller
  fastify.delete('/admin/sellers/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any

      // Get seller before deletion for audit log
      const before = await getSellerById(id, reqTenantId(request))

      const deleted = await deleteSeller(id, reqTenantId(request))
      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Seller not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'delete',
        entityType: 'seller',
        entityId: id,
        changes: { before: before || undefined }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // USERS MANAGEMENT
  // ============================================

  // Get all users
  fastify.get('/admin/users', { preHandler: adminMiddleware }, async (request) => {
    try {
      const tid = reqTenantId(request)
      const users = await getUsersCollection()
        .find({ tenantId: tid })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      // Enrich with order stats
      const enrichedUsers = await Promise.all(users.map(async (user: any) => {
        const orderStats = await getOrdersCollection().aggregate([
          { $match: { userId: user.id, tenantId: tid, status: { $in: ['paid', 'delivered'] } } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]).toArray()

        return {
          id: user._id?.toString() || user.id,
          oderId: user.id,
          telegramId: user.id,
          username: user.username,
          firstName: user.name?.split(' ')[0] || user.name,
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          isBlocked: user.isBlocked || false,
          blockReason: user.blockReason,
          isPremium: user.isPremium || false,
          ordersCount: orderStats[0]?.count || 0,
          totalSpent: orderStats[0]?.total || 0,
          createdAt: user.createdAt
        }
      }))

      return { success: true, users: enrichedUsers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Update user
  fastify.put('/admin/users/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { isBlocked, blockReason, isPremium } = request.body as any
      const tid = reqTenantId(request)

      // Find the user first
      const user = await getUsersCollection().findOne({
        $or: [{ id: id }, { _id: id }],
        tenantId: tid
      })

      if (!user) {
        reply.code(404)
        return { success: false, error: 'User not found' }
      }

      const updates: any = {}
      if (isBlocked !== undefined) updates.isBlocked = isBlocked
      if (blockReason !== undefined) updates.blockReason = blockReason
      if (isPremium !== undefined) updates.isPremium = isPremium

      await getUsersCollection().updateOne(
        { _id: user._id },
        { $set: updates }
      )

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'user',
        entityId: id,
        changes: { before: { isBlocked: user.isBlocked, isPremium: user.isPremium }, after: updates }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // ADMINS MANAGEMENT
  // ============================================

  // Get all admins
  fastify.get('/admin/admins', { preHandler: adminMiddleware }, async (request) => {
    try {
      const admins = await loadAdmins(reqTenantId(request))
      return { success: true, admins }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Add admin
  fastify.post('/admin/admins', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { userId, username, name } = request.body as { userId?: string; username?: string; name?: string }

      if (!userId && !username) {
        reply.code(400)
        return { success: false, error: 'userId or username is required' }
      }

      // Check if already exists
      if (userId) {
        const existing = await getAdminByUserId(userId, reqTenantId(request))
        if (existing) {
          reply.code(400)
          return { success: false, error: 'Admin with this userId already exists' }
        }
      }
      if (username) {
        const existing = await getAdminByUsername(username, reqTenantId(request))
        if (existing) {
          reply.code(400)
          return { success: false, error: 'Admin with this username already exists' }
        }
      }

      const admin: Admin = {
        tenantId: reqTenantId(request),
        id: String(Date.now()),
        userId: userId || undefined,
        username: username?.toLowerCase() || undefined,
        name: name || undefined,
        addedAt: new Date().toISOString()
      }

      const saved = await addAdmin(admin, reqTenantId(request))

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'admin',
        entityId: saved.id,
        changes: { after: saved }
      })

      return { success: true, admin: saved }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Remove admin
  fastify.delete('/admin/admins/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any

      // Get admin before deletion for audit log
      const before = await getAdminById(id, reqTenantId(request))

      const deleted = await deleteAdmin(id, reqTenantId(request))
      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Admin not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'delete',
        entityType: 'admin',
        entityId: id,
        changes: { before: before || undefined }
      })

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // PROMO CODES MANAGEMENT
  // ============================================

  // Get all promo codes (tenant-scoped)
  fastify.get('/admin/promo', { preHandler: adminMiddleware }, async (request) => {
    const { loadPromoCodes } = await import('../dataStore')
    const promoCodes = await loadPromoCodes(reqTenantId(request))
    return { success: true, promoCodes }
  })

  // Create promo code
  fastify.post('/admin/promo', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const promo = validateBody(createPromoSchema, request.body)
      const newPromo = {
        ...promo,
        usedCount: 0,
        createdAt: new Date().toISOString()
      }
      await addPromoCode(newPromo as any, reqTenantId(request))
      fastify.promoCodes.push(newPromo)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'promo_code',
        entityId: newPromo.code,
        changes: { after: newPromo }
      })

      return { success: true, promo: newPromo }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Update promo code
  fastify.put('/admin/promo/:code', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { code } = request.params as any
      const updates = validateBody(updatePromoSchema, request.body)

      // Get promo code before update for audit log
      const before = await getPromoByCode(code, reqTenantId(request))

      const updated = await updatePromoCode(code, updates, reqTenantId(request))
      if (!updated) {
        reply.code(404)
        return { success: false, error: 'Promo code not found' }
      }
      const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
      if (index !== -1) fastify.promoCodes[index] = { ...fastify.promoCodes[index], ...updates }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'promo_code',
        entityId: code.toUpperCase(),
        changes: { before: before || undefined, after: updated || undefined }
      })

      return { success: true, promo: updated }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Delete promo code
  fastify.delete('/admin/promo/:code', { preHandler: adminMiddleware }, async (request, reply) => {
    const { code } = request.params as any

    // Get promo code before deletion for audit log
    const before = await getPromoByCode(code, reqTenantId(request))

    const deleted = await deletePromoCode(code, reqTenantId(request))
    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'Promo code not found' }
    }
    const index = fastify.promoCodes.findIndex(p => p.code === code.toUpperCase())
    if (index !== -1) fastify.promoCodes.splice(index, 1)

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'promo_code',
      entityId: code.toUpperCase(),
      changes: { before: before || undefined }
    })

    return { success: true }
  })

  // ============================================
  // ORDERS MANAGEMENT
  // ============================================

  // Get all orders with filters
  fastify.get('/admin/orders', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const query = validateQuery(orderQuerySchema, request.query)
      const filters: { status?: OrderStatus; userId?: string } = {}
      if (query.status) filters.status = query.status
      if (query.userId) filters.userId = query.userId

      const [orders, total] = await Promise.all([
        getOrdersWithFilters(filters, query.limit, query.offset, reqTenantId(request)),
        countOrders(filters, reqTenantId(request))
      ])

      return {
        success: true,
        orders,
        total,
        limit: query.limit,
        offset: query.offset
      }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Get orders stats
  fastify.get('/admin/orders/stats', { preHandler: adminMiddleware }, async (request) => {
    const stats = await getOrderStats(reqTenantId(request))
    return { success: true, stats }
  })

  // Get single order
  fastify.get('/admin/orders/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any
    const order = await getOrderById(id, reqTenantId(request))

    if (!order) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Decrypt delivery data if encrypted
    if (order.deliveryData) {
      try {
        const { safeDecrypt } = await import('../deliveryCrypto')
        const decrypted = safeDecrypt(order.deliveryData)
        if (decrypted) {
          order.deliveryData = decrypted
        }
      } catch (err) {
        // Keep as-is if decryption fails
      }
    }

    return { success: true, order }
  })

  // Update order status
  fastify.put('/admin/orders/:id/status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { status } = validateBody(updateOrderStatusSchema, request.body)

      // Get order before update for audit log
      const before = await getOrderById(id, reqTenantId(request))

      const updates: Partial<Order> = { status }
      if (status === 'delivered') {
        updates.deliveredAt = new Date().toISOString()
      }

      const updatedOrder = await updateOrder(id, updates, reqTenantId(request))
      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'status_change',
        entityType: 'order',
        entityId: id,
        changes: {
          before: { status: before?.status },
          after: { status: updatedOrder.status }
        }
      })

      return { success: true, order: updatedOrder }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Deliver order
  fastify.post('/admin/orders/:id/deliver', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as any
      const { deliveryData, deliveryNote } = validateBody(deliverOrderSchema, request.body)

      // Get order before update for audit log
      const before = await getOrderById(id, reqTenantId(request))

      // Encrypt delivery data before storage
      let encryptedDeliveryData: any = deliveryData
      try {
        const { encryptDeliveryData } = await import('../deliveryCrypto')
        encryptedDeliveryData = encryptDeliveryData(deliveryData)
      } catch (err) {
        console.warn('[Admin] DELIVERY_SECRET not set, storing plaintext')
      }

      const updatedOrder = await updateOrder(id, {
        status: 'delivered',
        deliveryData: encryptedDeliveryData,
        deliveryNote,
        deliveredAt: new Date().toISOString()
      }, reqTenantId(request))

      if (!updatedOrder) {
        reply.code(404)
        return { success: false, error: 'Order not found' }
      }

      // SECURITY: Don't log sensitive delivery data
      console.log('Order delivered:', id, { hasDeliveryData: !!deliveryData, hasNote: !!deliveryNote })

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'deliver',
        entityType: 'order',
        entityId: id,
        changes: {
          before: { status: before?.status },
          after: { status: 'delivered', deliveryData, deliveryNote }
        }
      })

      return { success: true, order: updatedOrder }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Cancel order
  fastify.post('/admin/orders/:id/cancel', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get order before update for audit log
    const before = await getOrderById(id, reqTenantId(request))

    const updatedOrder = await updateOrder(id, {
      status: 'cancelled'
    }, reqTenantId(request))

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'cancel',
      entityType: 'order',
      entityId: id,
      changes: {
        before: { status: before?.status },
        after: { status: 'cancelled' }
      }
    })

    return { success: true, order: updatedOrder }
  })

  // Refund order
  fastify.post('/admin/orders/:id/refund', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as any

    // Get order before update for audit log
    const before = await getOrderById(id, reqTenantId(request))

    const updatedOrder = await updateOrder(id, {
      status: 'refunded'
    }, reqTenantId(request))

    if (!updatedOrder) {
      reply.code(404)
      return { success: false, error: 'Order not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'refund',
      entityType: 'order',
      entityId: id,
      changes: {
        before: { status: before?.status },
        after: { status: 'refunded' }
      }
    })

    return { success: true, order: updatedOrder }
  })

  // ============================================
  // BACKUP & RESTORE
  // ============================================

  // Get backup stats
  fastify.get('/admin/backup/stats', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const stats = await getBackupStats()
      return { success: true, data: stats }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create backup
  fastify.post('/admin/backup/create', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const backup = await createBackup()
      return { success: true, backup }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Restore from backup
  fastify.post('/admin/backup/restore', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const backup = request.body as any

      // Validate backup structure
      const validation = validateBackup(backup)
      if (!validation.valid) {
        reply.code(400)
        return { success: false, error: 'Invalid backup format', details: validation.errors }
      }

      const result = await restoreFromBackup(backup)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'restore',
        entityType: 'backup',
        entityId: backup.createdAt || 'unknown',
        metadata: { restored: result.restored }
      })

      return { success: true, restored: result.restored }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // FILES (for persistent image storage)
  // ============================================

  // Get all files
  fastify.get('/admin/files', { preHandler: adminMiddleware }, async () => {
    const { getFiles } = await import('../dataStore')
    const files = await getFiles()
    return { success: true, files }
  })

  // Upload file (base64)
  fastify.post('/admin/files', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { name, type, size, data } = request.body as {
        name: string
        type: string
        size: number
        data: string
      }

      if (!name || !type || !data) {
        reply.code(400)
        return { success: false, error: 'Missing required fields: name, type, data' }
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (size > maxSize) {
        reply.code(400)
        return { success: false, error: 'File too large. Max size: 5MB' }
      }

      const { saveFile } = await import('../dataStore')
      const file = await saveFile({
        tenantId: reqTenantId(request),
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        size,
        data,
        uploadedAt: new Date().toISOString()
      })

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'file',
        entityId: file.id,
        changes: { after: { id: file.id, name: file.name, type: file.type, size: file.size } }
      })

      return { success: true, file }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get file by ID (returns base64 data)
  fastify.get('/admin/files/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { getFileById } = await import('../dataStore')
    const file = await getFileById(id)

    if (!file) {
      reply.code(404)
      return { success: false, error: 'File not found' }
    }

    return { success: true, file }
  })

  // Delete file
  fastify.delete('/admin/files/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { deleteFile, getFileById } = await import('../dataStore')

    // Get file before deletion for audit log
    const before = await getFileById(id)

    const deleted = await deleteFile(id)

    if (!deleted) {
      reply.code(404)
      return { success: false, error: 'File not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'file',
      entityId: id,
      changes: { before: before ? { id: before.id, name: before.name, type: before.type, size: before.size } : undefined }
    })

    return { success: true }
  })

  // ============================================
  // REVIEWS (admin management)
  // ============================================

  // Get all reviews
  fastify.get('/admin/reviews', { preHandler: adminMiddleware }, async () => {
    const { getReviewsCollection, toClientDoc } = await import('../database')
    const reviews = await getReviewsCollection().find({}).sort({ createdAt: -1 }).toArray()
    return { success: true, reviews: reviews.map(r => toClientDoc(r)) }
  })

  // Create review (admin can create fake reviews)
  fastify.post('/admin/reviews', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { productId, userName, rating, text } = request.body as {
        productId: string
        userName: string
        rating: number
        text: string
      }

      if (!productId || !userName || !rating || !text) {
        reply.code(400)
        return { success: false, error: 'Missing required fields' }
      }

      const { getReviewsCollection, toClientDoc } = await import('../database')
      const review = {
        id: `review-${Date.now()}`,
        productId,
        userId: 'admin',
        userName,
        rating: Math.min(5, Math.max(1, rating)),
        text,
        createdAt: new Date().toISOString()
      }

      const result = await getReviewsCollection().insertOne(review as any)

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'review',
        entityId: review.id,
        changes: { after: review }
      })

      return { success: true, review: { ...review, _id: result.insertedId.toString() } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update review
  fastify.put('/admin/reviews/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as { userName?: string; rating?: number; text?: string }

      const { getReviewsCollection, toClientDoc } = await import('../database')

      // Get review before update for audit log
      const before = await getReviewsCollection().findOne({ id })

      const result = await getReviewsCollection().findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after' }
      )

      if (!result) {
        reply.code(404)
        return { success: false, error: 'Review not found' }
      }

      // Log the action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'review',
        entityId: id,
        changes: {
          before: before ? toClientDoc(before) : undefined,
          after: toClientDoc(result)
        }
      })

      return { success: true, review: toClientDoc(result) }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete review
  fastify.delete('/admin/reviews/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { getReviewsCollection, toClientDoc } = await import('../database')

    // Get review before deletion for audit log
    const review = await getReviewsCollection().findOne({ id })

    const result = await getReviewsCollection().deleteOne({ id })

    if (result.deletedCount === 0) {
      reply.code(404)
      return { success: false, error: 'Review not found' }
    }

    // Log the action
    const adminInfo = getAdminInfo(request)
    await logAdminAction({
      ...adminInfo,
      action: 'delete',
      entityType: 'review',
      entityId: id,
      changes: { before: review ? toClientDoc(review) : undefined }
    })

    return { success: true }
  })

  // ============================================
  // AUDIT LOGS
  // ============================================

  // Get audit logs with filters and pagination
  fastify.get('/admin/audit-logs', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const {
        action,
        entityType,
        entityId,
        adminId,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = request.query as {
        action?: AuditAction
        entityType?: AuditEntityType
        entityId?: string
        adminId?: string
        startDate?: string
        endDate?: string
        limit?: number
        offset?: number
      }

      const filters: any = {}
      if (action) filters.action = action
      if (entityType) filters.entityType = entityType
      if (entityId) filters.entityId = entityId
      if (adminId) filters.adminId = adminId
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate

      const result = await getAuditLogs(filters, Number(limit), Number(offset))

      return {
        success: true,
        logs: result.logs,
        total: result.total,
        limit: Number(limit),
        offset: Number(offset)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get audit logs for a specific entity
  fastify.get('/admin/audit-logs/:entityType/:entityId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as { entityType: AuditEntityType; entityId: string }
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number }

      const result = await getAuditLogsByEntity(entityType, entityId, Number(limit), Number(offset))

      return {
        success: true,
        logs: result.logs,
        total: result.total,
        limit: Number(limit),
        offset: Number(offset)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // CSV IMPORT
  // ============================================

  // Import products from CSV
  fastify.post('/admin/import/products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { csv } = request.body as { csv: string }
      if (!csv) {
        reply.code(400)
        return { success: false, error: 'CSV data required' }
      }

      const { importProductsFromCSV } = await import('../csvImporter')
      const result = await importProductsFromCSV(csv)

      // Log action
      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'product',
        entityId: 'bulk_import',
        metadata: { imported: result.imported, errors: result.errors.length }
      })

      return result
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get CSV template
  fastify.get('/admin/import/template', { preHandler: adminMiddleware }, async () => {
    const { getCSVTemplate } = await import('../csvImporter')
    return { success: true, template: getCSVTemplate() }
  })

  // ============================================
  // EXTENDED STATISTICS
  // ============================================

  // Dashboard stats
  fastify.get('/admin/stats/dashboard', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getDashboardStats } = await import('../statistics')
      const stats = await getDashboardStats(period as any)
      return { success: true, stats }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Revenue chart
  fastify.get('/admin/stats/revenue', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getRevenueChart } = await import('../statistics')
      const data = await getRevenueChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Orders chart
  fastify.get('/admin/stats/orders-chart', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getOrdersChart } = await import('../statistics')
      const data = await getOrdersChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Top products
  fastify.get('/admin/stats/top-products', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', limit = 10 } = request.query as { period?: string; limit?: number }
      const { getTopProducts } = await import('../statistics')
      const data = await getTopProducts(period as any, Number(limit))
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Payment method stats
  fastify.get('/admin/stats/payment-methods', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getPaymentMethodStats } = await import('../statistics')
      const data = await getPaymentMethodStats(period as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // User growth chart
  fastify.get('/admin/stats/user-growth', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d', groupBy = 'day' } = request.query as { period?: string; groupBy?: string }
      const { getUserGrowthChart } = await import('../statistics')
      const data = await getUserGrowthChart(period as any, groupBy as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Category stats
  fastify.get('/admin/stats/categories', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { period = '30d' } = request.query as { period?: string }
      const { getCategoryStats } = await import('../statistics')
      const data = await getCategoryStats(period as any)
      return { success: true, data }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // 2FA MANAGEMENT
  // ============================================

  // Setup 2FA
  fastify.post('/admin/2fa/setup', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { setup2FA } = await import('../twoFactorAuth')
      const result = await setup2FA(user.userId)
      return { success: true, ...result }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Enable 2FA
  fastify.post('/admin/2fa/enable', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { code } = request.body as { code: string }

      if (!user?.userId || !code) {
        reply.code(400)
        return { success: false, error: 'Code required' }
      }

      const { enable2FA } = await import('../twoFactorAuth')
      const enabled = enable2FA(user.userId, code)

      if (!enabled) {
        reply.code(400)
        return { success: false, error: 'Invalid code' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Disable 2FA
  fastify.post('/admin/2fa/disable', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { code } = request.body as { code: string }

      if (!user?.userId || !code) {
        reply.code(400)
        return { success: false, error: 'Code required' }
      }

      const { disable2FA } = await import('../twoFactorAuth')
      const disabled = disable2FA(user.userId, code)

      if (!disabled) {
        reply.code(400)
        return { success: false, error: 'Invalid code' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Check 2FA status
  fastify.get('/admin/2fa/status', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { is2FAEnabled, getBackupCodesCount } = await import('../twoFactorAuth')
      return {
        success: true,
        enabled: is2FAEnabled(user.userId),
        backupCodesRemaining: getBackupCodesCount(user.userId)
      }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Regenerate backup codes
  fastify.post('/admin/2fa/backup-codes', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const user = (request as any).user
      if (!user?.userId) {
        reply.code(401)
        return { success: false, error: 'Not authenticated' }
      }

      const { regenerateBackupCodes } = await import('../twoFactorAuth')
      const codes = regenerateBackupCodes(user.userId)

      if (!codes) {
        reply.code(400)
        return { success: false, error: '2FA not enabled' }
      }

      return { success: true, backupCodes: codes }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // ADMIN ROLES
  // ============================================

  // Get all roles
  fastify.get('/admin/roles', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { getAllRoles } = await import('../adminRoles')
      const roles = await getAllRoles()
      return { success: true, roles }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create role
  fastify.post('/admin/roles', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const roleData = request.body as any
      const { createRole } = await import('../adminRoles')
      const role = await createRole(roleData)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'admin',
        entityId: role.id,
        metadata: { type: 'role', name: role.name }
      })

      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update role
  fastify.put('/admin/roles/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as any
      const { updateRole } = await import('../adminRoles')
      const role = await updateRole(id, updates)

      if (!role) {
        reply.code(404)
        return { success: false, error: 'Role not found' }
      }

      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete role
  fastify.delete('/admin/roles/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { deleteRole } = await import('../adminRoles')
      const deleted = await deleteRole(id)

      if (!deleted) {
        reply.code(400)
        return { success: false, error: 'Cannot delete system role' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Assign role to admin
  fastify.post('/admin/roles/assign', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { adminId, roleId } = request.body as { adminId: string; roleId: string }
      const user = (request as any).user

      const { assignRole } = await import('../adminRoles')
      const assignment = await assignRole(adminId, roleId, user?.userId)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'update',
        entityType: 'admin',
        entityId: adminId,
        metadata: { type: 'role_assignment', roleId }
      })

      return { success: true, assignment }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get admin's role
  fastify.get('/admin/roles/admin/:adminId', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { adminId } = request.params as { adminId: string }
      const { getAdminRole } = await import('../adminRoles')
      const role = await getAdminRole(adminId)
      return { success: true, role }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // ============================================
  // WEBHOOKS
  // ============================================

  // Get all webhooks
  fastify.get('/admin/webhooks', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { getAllWebhooks } = await import('../webhooks')
      const webhooks = await getAllWebhooks()
      // Hide secrets
      const safeWebhooks = webhooks.map(w => ({ ...w, secret: '***' }))
      return { success: true, webhooks: safeWebhooks }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get webhook by ID
  fastify.get('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { getWebhookById } = await import('../webhooks')
      const webhook = await getWebhookById(id)

      if (!webhook) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, webhook: { ...webhook, secret: '***' } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create webhook
  fastify.post('/admin/webhooks', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const webhookData = request.body as any
      const { createWebhook } = await import('../webhooks')
      const webhook = await createWebhook(webhookData)

      const adminInfo = getAdminInfo(request)
      await logAdminAction({
        ...adminInfo,
        action: 'create',
        entityType: 'backup', // Using 'backup' as closest type for webhooks
        entityId: webhook.id,
        metadata: { type: 'webhook', name: webhook.name, url: webhook.url }
      })

      return { success: true, webhook }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update webhook
  fastify.put('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const updates = request.body as any
      const { updateWebhook } = await import('../webhooks')
      const webhook = await updateWebhook(id, updates)

      if (!webhook) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, webhook: { ...webhook, secret: '***' } }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete webhook
  fastify.delete('/admin/webhooks/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { deleteWebhook } = await import('../webhooks')
      const deleted = await deleteWebhook(id)

      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Regenerate webhook secret
  fastify.post('/admin/webhooks/:id/regenerate-secret', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { regenerateSecret } = await import('../webhooks')
      const secret = await regenerateSecret(id)

      if (!secret) {
        reply.code(404)
        return { success: false, error: 'Webhook not found' }
      }

      return { success: true, secret }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Test webhook
  fastify.post('/admin/webhooks/:id/test', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { testWebhook } = await import('../webhooks')
      const result = await testWebhook(id)
      return { ...result }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get webhook delivery logs
  fastify.get('/admin/webhooks/:id/logs', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { limit = 50 } = request.query as { limit?: number }
      const { getDeliveryLogs } = await import('../webhooks')
      const logs = await getDeliveryLogs(id, Number(limit))
      return { success: true, logs }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}

