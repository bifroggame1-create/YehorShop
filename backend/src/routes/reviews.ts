import { FastifyInstance, FastifyRequest } from 'fastify'
import { getReviewsCollection, getOrdersCollection, getProductsCollection, Review } from '../database'
import { logger } from '../logger'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}

export async function reviewRoutes(fastify: FastifyInstance) {
  // Get reviews for a product
  fastify.get('/reviews/product/:productId', async (request, reply) => {
    const reviews = getReviewsCollection()

    try {
      const { productId } = request.params as { productId: string }

      const productReviews = await reviews
        .find({ productId })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      // Map _id to id for client
      const result = productReviews.map(r => ({
        id: r.id || r._id?.toString(),
        productId: r.productId,
        userId: r.userId,
        userName: r.userName,
        userAvatar: r.userAvatar,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt
      }))

      return result
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get product reviews')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Get reviews by a user
  fastify.get('/reviews/user/:userId', async (request, reply) => {
    const reviews = getReviewsCollection()

    try {
      const { userId } = request.params as { userId: string }

      const userReviews = await reviews
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      const result = userReviews.map(r => ({
        id: r.id || r._id?.toString(),
        productId: r.productId,
        userId: r.userId,
        userName: r.userName,
        userAvatar: r.userAvatar,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt
      }))

      return result
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get user reviews')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Check if user can review a product
  fastify.get('/reviews/can-review/:userId/:productId', async (request, reply) => {
    const reviews = getReviewsCollection()
    const orders = getOrdersCollection()

    try {
      const { userId, productId } = request.params as { userId: string; productId: string }

      // Check if user has a delivered order for this product
      const deliveredOrder = await orders.findOne({
        userId,
        productId,
        status: 'delivered'
      })

      if (!deliveredOrder) {
        return { canReview: false, reason: 'No delivered orders for this product' }
      }

      // Check if user already reviewed this product
      const existingReview = await reviews.findOne({
        userId,
        productId
      })

      if (existingReview) {
        return { canReview: false, reason: 'Already reviewed this product' }
      }

      return {
        canReview: true,
        orderId: deliveredOrder.id
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to check review eligibility')
      reply.code(500)
      return { error: error.message }
    }
  })

  // Create a review
  fastify.post('/reviews', async (request, reply) => {
    const reviews = getReviewsCollection()
    const orders = getOrdersCollection()
    const products = getProductsCollection()

    try {
      const { productId, userId, userName, userAvatar, rating, text, orderId } = request.body as {
        productId: string
        userId: string
        userName: string
        userAvatar?: string
        rating: number
        text: string
        orderId?: string
      }

      // Validate required fields
      if (!productId || !userId || !userName || !rating || !text) {
        reply.code(400)
        return { success: false, error: 'Missing required fields' }
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        reply.code(400)
        return { success: false, error: 'Rating must be between 1 and 5' }
      }

      // Check if user can review
      const deliveredOrder = await orders.findOne({
        userId,
        productId,
        status: 'delivered'
      })

      if (!deliveredOrder) {
        reply.code(403)
        return { success: false, error: 'You must purchase this product before reviewing' }
      }

      // Check for duplicate review
      const existingReview = await reviews.findOne({ userId, productId })
      if (existingReview) {
        reply.code(400)
        return { success: false, error: 'You have already reviewed this product' }
      }

      // Create review
      const review: Review = {
        tenantId: reqTenantId(request),
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        userId,
        userName,
        userAvatar,
        orderId: orderId || deliveredOrder.id,
        rating,
        text: text.trim(),
        createdAt: new Date().toISOString()
      }

      await reviews.insertOne(review)

      // Update product rating
      const productReviews = await reviews.find({ productId }).toArray()
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length

      await products.updateOne(
        { _id: productId },
        { $set: { rating: Math.round(avgRating * 10) / 10 } }
      )

      logger.info({
        reviewId: review.id,
        productId,
        userId,
        rating
      }, 'Review created')

      return {
        success: true,
        review: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          userName: review.userName,
          userAvatar: review.userAvatar,
          rating: review.rating,
          text: review.text,
          createdAt: review.createdAt
        }
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to create review')
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Get average rating for a product
  fastify.get('/reviews/product/:productId/stats', async (request, reply) => {
    const reviews = getReviewsCollection()

    try {
      const { productId } = request.params as { productId: string }

      const productReviews = await reviews.find({ productId }).toArray()

      if (productReviews.length === 0) {
        return {
          count: 0,
          average: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      }

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      let sum = 0

      for (const review of productReviews) {
        sum += review.rating
        distribution[review.rating as 1 | 2 | 3 | 4 | 5]++
      }

      return {
        count: productReviews.length,
        average: Math.round((sum / productReviews.length) * 10) / 10,
        distribution
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to get review stats')
      reply.code(500)
      return { error: error.message }
    }
  })
}
