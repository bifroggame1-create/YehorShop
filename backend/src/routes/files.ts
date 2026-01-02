import { FastifyInstance } from 'fastify'
import { getFileById } from '../dataStore'

export async function fileRoutes(fastify: FastifyInstance) {
  // Public file serving - GET /files/:id
  // Returns actual binary image data, not JSON
  fastify.get('/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const file = await getFileById(id)
    if (!file) {
      reply.code(404)
      return { error: 'File not found' }
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      reply.code(415)
      return { error: 'Unsupported file type' }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file.data, 'base64')

    // Set cache headers (1 year for immutable content)
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    reply.header('Content-Type', file.type)
    reply.header('Content-Length', buffer.length)
    reply.header('Content-Disposition', `inline; filename="${file.name}"`)

    return reply.send(buffer)
  })
}
