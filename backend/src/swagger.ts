import { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Yehor Shop API',
        description: 'Backend API for Yehor Shop Telegram Mini App marketplace',
        version: '2.0.0',
        contact: {
          name: 'Yehor Shop Support',
          email: 'support@yehorshop.ai'
        }
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production'
            ? 'https://yehorshopai-back.onrender.com'
            : 'http://localhost:3001',
          description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
        }
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Products', description: 'Product catalog endpoints' },
        { name: 'Payments', description: 'Payment processing (CryptoBot, CactusPay)' },
        { name: 'Promo', description: 'Promo codes management' },
        { name: 'Users', description: 'User management' },
        { name: 'Chats', description: 'Chat functionality' },
        { name: 'Admin', description: 'Admin operations' },
        { name: 'Health', description: 'Health check endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          Product: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              images: { type: 'array', items: { type: 'string' } },
              condition: { type: 'string', enum: ['new', 'used'] },
              category: { type: 'string' },
              seller: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  rating: { type: 'number' }
                }
              },
              rating: { type: 'number' },
              description: { type: 'string' },
              inStock: { type: 'boolean' },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    period: { type: 'string' },
                    features: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              productId: { type: 'string' },
              productName: { type: 'string' },
              variantId: { type: 'string' },
              variantName: { type: 'string' },
              amount: { type: 'number' },
              paymentMethod: { type: 'string' },
              paymentId: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'paid', 'delivered', 'cancelled'] },
              createdAt: { type: 'string', format: 'date-time' },
              paidAt: { type: 'string', format: 'date-time' }
            }
          },
          PromoCode: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              discountType: { type: 'string', enum: ['percentage', 'fixed'] },
              discountValue: { type: 'number' },
              minOrderAmount: { type: 'number' },
              maxUses: { type: 'number' },
              usedCount: { type: 'number' },
              isActive: { type: 'boolean' },
              description: { type: 'string' }
            }
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              telegramId: { type: 'string' },
              username: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              photoUrl: { type: 'string' },
              favorites: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              lastSeen: { type: 'string', format: 'date-time' }
            }
          },
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' }
            }
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true }
            }
          }
        }
      }
    }
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true
    },
    staticCSP: true
  })

  console.log('✅ Swagger docs available at /docs')
}
