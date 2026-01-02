import { FastifyInstance, FastifyRequest } from 'fastify'
import { validateBody, createChatSchema } from '../validation'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Helper to get tenant ID from request with fallback
function reqTenantId(request: FastifyRequest): string {
  return request.tenantId || DEFAULT_TENANT_ID
}
import {
  addChat,
  getChatsByUserId,
  getChatById,
  getChatMessages,
  addChatMessage,
  Chat,
  ChatMessage
} from '../dataStore'

export async function chatRoutes(fastify: FastifyInstance) {
  // Create chat
  fastify.post('/chats/create', async (request, reply) => {
    try {
      const data = validateBody(createChatSchema, request.body)

      // Check if chat already exists between these users for this product
      const existingChats = await getChatsByUserId(data.buyerId)
      const existingChat = existingChats.find(
        c => c.participants.includes(data.sellerId) && c.productId === data.productId
      )

      if (existingChat) {
        return { success: true, chat: existingChat, existing: true }
      }

      const chat: Chat = {
        tenantId: reqTenantId(request),
        id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        participants: [data.buyerId, data.sellerId],
        productId: data.productId,
        productName: data.productName,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      }

      const savedChat = await addChat(chat)
      return { success: true, chat: savedChat }
    } catch (error: any) {
      reply.code(error.statusCode || 500)
      return { success: false, error: error.error || error.message, details: error.details }
    }
  })

  // Get user's chats
  fastify.get('/chats/user/:userId', async (request) => {
    const { userId } = request.params as any
    const chats = await getChatsByUserId(userId)
    return { success: true, chats }
  })

  // Get chat by ID
  fastify.get('/chats/:id', async (request, reply) => {
    const { id } = request.params as any
    const chat = await getChatById(id)

    if (!chat) {
      reply.code(404)
      return { success: false, error: 'Chat not found' }
    }

    return { success: true, chat }
  })

  // Get chat messages
  fastify.get('/chats/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as any
      const { limit = 50, offset = 0 } = request.query as any

      const chat = await getChatById(id)
      if (!chat) {
        reply.code(404)
        return { success: false, error: 'Chat not found' }
      }

      const messages = await getChatMessages(id, reqTenantId(request), parseInt(limit), parseInt(offset))
      return { success: true, messages }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Send message (REST fallback when WebSocket is not available)
  fastify.post('/chats/:id/messages', async (request, reply) => {
    try {
      const { id } = request.params as any
      const { senderId, senderName, content, messageType, fileUrl, fileName, fileSize } = request.body as any

      if (!senderId || !content) {
        reply.code(400)
        return { success: false, error: 'senderId and content are required' }
      }

      const chat = await getChatById(id)
      if (!chat) {
        reply.code(404)
        return { success: false, error: 'Chat not found' }
      }

      const message: ChatMessage = {
        tenantId: reqTenantId(request),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId: id,
        senderId,
        senderName: senderName || 'Anonymous',
        content,
        messageType: messageType || 'text',
        fileUrl,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
        isRead: false
      }

      const savedMessage = await addChatMessage(message)
      return { success: true, message: savedMessage }
    } catch (error: any) {
      reply.code(500)
      return { success: false, error: error.message }
    }
  })

  // Upload file for chat
  fastify.post('/chats/:id/upload', async (request, reply) => {
    try {
      const { id } = request.params as any
      const { file, fileName, fileType, senderId, senderName } = request.body as any

      if (!file || !fileName || !senderId) {
        reply.code(400)
        return { success: false, error: 'file, fileName and senderId are required' }
      }

      const chat = await getChatById(id)
      if (!chat) {
        reply.code(404)
        return { success: false, error: 'Chat not found' }
      }

      // The file comes as base64 from frontend
      // In production, you'd upload to S3/CloudStorage
      // For now, we store base64 directly
      const fileUrl = file // base64 data URL

      // Determine message type based on file type
      let messageType: 'image' | 'file' = 'file'
      if (fileType?.startsWith('image/')) {
        messageType = 'image'
      }

      // Calculate approximate size from base64
      const base64Length = file.replace(/^data:.*?;base64,/, '').length
      const fileSize = Math.round((base64Length * 3) / 4)

      const message: ChatMessage = {
        tenantId: reqTenantId(request),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId: id,
        senderId,
        senderName: senderName || 'Anonymous',
        content: fileName,
        messageType,
        fileUrl,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
        isRead: false
      }

      const savedMessage = await addChatMessage(message)
      return { success: true, message: savedMessage }
    } catch (error: any) {
      console.error('Upload error:', error)
      reply.code(500)
      return { success: false, error: error.message }
    }
  })
}
