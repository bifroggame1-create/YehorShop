import { FastifyInstance, FastifyRequest } from 'fastify'
import { adminMiddleware } from '../auth'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import {
  loadTags,
  getTagById,
  getTagByName,
  addTag,
  updateTag,
  deleteTag,
  countProductsByTag,
  Tag
} from '../dataStore'

export async function tagsRoutes(fastify: FastifyInstance) {
  // ============================================
  // TAGS MANAGEMENT
  // ============================================

  // Get all tags
  fastify.get('/admin/tags', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const tags = await loadTags()
      // Add product count for each tag
      const tagsWithCount = await Promise.all(
        tags.map(async (tag) => ({
          ...tag,
          productCount: await countProductsByTag(tag.id)
        }))
      )
      return { success: true, tags: tagsWithCount }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Create tag
  fastify.post('/admin/tags', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { name, color } = request.body as { name: string; color?: string }

      if (!name || name.trim().length === 0) {
        reply.code(400)
        return { success: false, error: 'Tag name is required' }
      }

      // Check if tag with same name already exists
      const existing = await getTagByName(name.trim())
      if (existing) {
        reply.code(400)
        return { success: false, error: 'Tag with this name already exists' }
      }

      const tag: Tag = {
        tenantId: reqTenantId(request),
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        color: color?.trim() || undefined,
        createdAt: new Date().toISOString()
      }

      const saved = await addTag(tag)
      return { success: true, tag: saved }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Update tag
  fastify.put('/admin/tags/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { name, color } = request.body as { name?: string; color?: string }

      // Check if tag exists
      const existing = await getTagById(id)
      if (!existing) {
        reply.code(404)
        return { success: false, error: 'Tag not found' }
      }

      const updates: Partial<Tag> = {}
      if (name !== undefined) {
        if (name.trim().length === 0) {
          reply.code(400)
          return { success: false, error: 'Tag name cannot be empty' }
        }
        // Check if another tag with same name exists
        const duplicate = await getTagByName(name.trim())
        if (duplicate && duplicate.id !== id) {
          reply.code(400)
          return { success: false, error: 'Tag with this name already exists' }
        }
        updates.name = name.trim()
      }
      if (color !== undefined) {
        updates.color = color.trim() || undefined
      }

      const updated = await updateTag(id, updates)
      return { success: true, tag: updated }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Delete tag
  fastify.delete('/admin/tags/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      const deleted = await deleteTag(id)
      if (!deleted) {
        reply.code(404)
        return { success: false, error: 'Tag not found' }
      }

      return { success: true }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}
