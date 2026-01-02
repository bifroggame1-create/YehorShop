import { FastifyInstance } from 'fastify'
import { validateQuery, productQuerySchema, favoriteIdsSchema } from '../validation'
import { searchProducts, getSearchSuggestions } from '../searchUtils'
import { loadProducts, getProductById } from '../dataStore'

// Products decorator for backward compatibility with admin routes
declare module 'fastify' {
  interface FastifyInstance {
    products: any[]
  }
}

export async function productRoutes(fastify: FastifyInstance) {
  // Get all products with optional filtering - NOW READS FROM MONGODB
  fastify.get('/products', async (request) => {
    const query = validateQuery(productQuerySchema, request.query)

    // Always load fresh from MongoDB for data consistency
    // Pass tenantId from request context (set by tenant middleware)
    let products = await loadProducts(request.tenantId)

    // Update in-memory cache for admin routes compatibility
    fastify.products = products

    // Apply category filter
    if (query.category) {
      products = products.filter(p => p.category === query.category)
    }

    // Apply condition filter
    if (query.condition && query.condition !== 'all') {
      products = products.filter(p => p.condition === query.condition)
    }

    // Apply search
    if (query.search) {
      products = searchProducts(products, query.search)
    }

    // Apply tag filter
    if (query.tags) {
      // Support both single tag and array of tags
      const tagIds = Array.isArray(query.tags) ? query.tags : [query.tags]
      products = products.filter(p =>
        p.tags && p.tags.some((tagId: string) => tagIds.includes(tagId))
      )
    }

    return products
  })

  // Search suggestions - load from MongoDB
  fastify.get('/products/search/suggestions', async (request) => {
    const { q } = request.query as any
    const products = await loadProducts(request.tenantId)
    return getSearchSuggestions(products, q || '')
  })

  // Get single product by ID - load from MongoDB
  fastify.get('/products/:id', async (request) => {
    const { id } = request.params as any
    const product = await getProductById(id, request.tenantId)
    return product || { error: 'Product not found' }
  })

  // Get favorite products by IDs - load from MongoDB
  fastify.post('/products/favorites', async (request) => {
    const { favoriteIds } = request.body as any
    if (!favoriteIds || favoriteIds.length === 0) return []
    const products = await loadProducts(request.tenantId)
    return products.filter(p => favoriteIds.includes(p._id))
  })
}
