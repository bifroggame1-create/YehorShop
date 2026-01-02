import { z } from 'zod'

// ============================================
// Common schemas
// ============================================

export const mongoIdSchema = z.string().min(1).max(50)

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

// ============================================
// User schemas
// ============================================

export const createUserSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100).optional(),
  username: z.string().max(50).optional(),
  avatar: z.string().url().optional(),
  referredBy: z.string().max(20).optional()
})

export const telegramAuthSchema = z.object({
  initData: z.string().min(1)
})

// ============================================
// Product schemas
// ============================================

export const productQuerySchema = z.object({
  category: z.string().max(50).optional(),
  condition: z.enum(['new', 'used', 'all']).optional(),
  search: z.string().max(100).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional()
})

export const productVariantSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  price: z.number().positive().max(10000000),
  period: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  features: z.array(z.string().max(100)).optional()
})

export const createProductSchema = z.object({
  _id: z.string().max(50).optional(),
  name: z.string().min(1).max(200),
  price: z.number().positive().max(10000000),
  oldPrice: z.number().positive().max(10000000).optional(),
  images: z.array(z.string().max(500000)).min(1).max(10), // Allow base64 images up to ~375KB
  condition: z.enum(['new', 'used']),
  category: z.string().min(1).max(50),
  description: z.string().max(5000).optional(),
  inStock: z.boolean().default(true),
  variants: z.array(productVariantSchema).optional(),
  seller: z.object({
    id: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    avatar: z.string().max(500000).optional(), // Allow base64 avatars
    rating: z.number().min(0).max(5).optional()
  })
})

export const updateProductSchema = createProductSchema.partial()

export const favoriteIdsSchema = z.object({
  favoriteIds: z.array(mongoIdSchema).max(100)
})

// ============================================
// Order schemas
// ============================================

export const orderStatusSchema = z.enum([
  'pending', 'paid', 'processing', 'delivered', 'cancelled', 'refunded'
])

export const createOrderSchema = z.object({
  userId: z.string().min(1).max(50),
  productId: z.string().min(1).max(50),
  variantId: z.string().max(50).optional(),
  amount: z.number().positive().max(10000000),
  paymentMethod: z.string().max(50).optional()
})

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema
})

export const deliverOrderSchema = z.object({
  deliveryData: z.string().min(1).max(5000),
  deliveryNote: z.string().max(1000).optional()
})

export const orderQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  userId: z.string().max(50).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

// ============================================
// Payment schemas
// ============================================

export const cryptoAssetSchema = z.enum(['TON', 'USDT', 'BTC', 'ETH', 'LTC', 'USDC'])

export const cactusPayMethodSchema = z.enum(['card', 'sbp', 'yoomoney', 'crypto', 'nspk'])

export const createCryptoInvoiceSchema = z.object({
  amount: z.number().positive().max(10000000),
  description: z.string().max(200).optional(),
  productId: z.string().min(1).max(50),
  variantId: z.string().max(50).optional(),
  asset: cryptoAssetSchema.optional().default('USDT'),
  userId: z.string().max(50).optional(),
  userName: z.string().max(100).optional(),
  userUsername: z.string().max(50).optional(),
  promoCode: z.string().max(50).optional() // promo code used for discount
})

export const createCactusPaymentSchema = z.object({
  amount: z.number().positive().max(10000000),
  description: z.string().max(200).optional(),
  productId: z.string().min(1).max(50),
  variantId: z.string().max(50).optional(),
  method: cactusPayMethodSchema.optional(),
  userIp: z.string().max(45).optional(), // IPv4 or IPv6
  userId: z.string().max(50).optional(),
  userName: z.string().max(100).optional(),
  userUsername: z.string().max(50).optional(),
  promoCode: z.string().max(50).optional() // promo code used for discount
})

export const cancelPaymentSchema = z.object({
  orderId: z.string().min(1).max(50)
})

// ============================================
// Promo schemas
// ============================================

export const validatePromoSchema = z.object({
  code: z.string().min(1).max(30).transform(s => s.toUpperCase()),
  orderAmount: z.number().positive().max(10000000)
})

export const createPromoSchema = z.object({
  code: z.string().min(1).max(30).transform(s => s.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive().max(100),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(200).optional()
})

export const updatePromoSchema = createPromoSchema.partial()

// ============================================
// Seller schemas
// ============================================

export const sellerBadgeSchema = z.enum(['new', 'trusted', 'verified', 'top_seller', 'high_volume', 'risky'])

export const createSellerSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  avatar: z.string().max(500000).optional(), // Allow base64 avatars
  rating: z.number().min(0).max(5).optional(),
  isVerified: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockReason: z.string().max(500).optional(),
  badges: z.array(sellerBadgeSchema).optional(),
  joinedAt: z.string().optional()
})

export const updateSellerSchema = createSellerSchema.partial()

// ============================================
// Chat schemas
// ============================================

export const createChatSchema = z.object({
  buyerId: z.string().min(1).max(50),
  sellerId: z.string().min(1).max(50),
  productId: z.string().min(1).max(50),
  productName: z.string().max(200).optional()
})

// ============================================
// Referral schemas
// ============================================

export const trackReferralSchema = z.object({
  userId: z.string().min(1).max(50),
  referrerId: z.string().min(1).max(50)
})

// ============================================
// Validation helper
// ============================================

/**
 * Validate request body with Zod schema
 * Returns parsed data or throws formatted error
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)

  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
    throw {
      statusCode: 400,
      error: 'Validation failed',
      details: errors
    }
  }

  return result.data
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  return validateBody(schema, query)
}

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CreateCryptoInvoiceInput = z.infer<typeof createCryptoInvoiceSchema>
export type CreateCactusPaymentInput = z.infer<typeof createCactusPaymentSchema>
export type ValidatePromoInput = z.infer<typeof validatePromoSchema>
export type CreatePromoInput = z.infer<typeof createPromoSchema>

console.log('✅ Validation schemas loaded')
