import { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'
import { addChatMessage, getChatById, addChat } from './dataStore'
import { logger } from './logger'

// Default tenant ID for fallback
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'yehorshop'

// Store active connections
const connections = new Map<string, Set<any>>()

interface WSMessage {
  type: 'join' | 'leave' | 'message' | 'typing' | 'read' | 'file'
  chatId?: string
  userId?: string
  userName?: string
  content?: string
  messageType?: 'text' | 'image' | 'file'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  timestamp?: string
}

export async function registerWebSocket(fastify: FastifyInstance) {
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB max message size
    }
  })

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    let currentChatId: string | null = null
    let currentUserId: string | null = null

    logger.info({ event: 'ws_connect' }, 'WebSocket client connected')

    connection.socket.on('message', async (rawMessage: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(rawMessage.toString())

        switch (message.type) {
          case 'join':
            if (message.chatId && message.userId) {
              currentChatId = message.chatId
              currentUserId = message.userId

              // Add connection to chat room
              if (!connections.has(message.chatId)) {
                connections.set(message.chatId, new Set())
              }
              connections.get(message.chatId)!.add(connection.socket)

              logger.info({
                event: 'ws_join',
                chatId: message.chatId,
                userId: message.userId
              }, `User ${message.userId} joined chat ${message.chatId}`)

              // Notify others in the chat
              broadcastToChat(message.chatId, {
                type: 'user_joined',
                userId: message.userId,
                userName: message.userName,
                timestamp: new Date().toISOString()
              }, connection.socket)
            }
            break

          case 'leave':
            if (currentChatId) {
              leaveChat(currentChatId, connection.socket)

              // Notify others
              broadcastToChat(currentChatId, {
                type: 'user_left',
                userId: currentUserId,
                timestamp: new Date().toISOString()
              })

              currentChatId = null
              currentUserId = null
            }
            break

          case 'message':
          case 'file':
            if (currentChatId && (message.content || message.fileUrl) && currentUserId) {
              const chatMessage = {
                tenantId: DEFAULT_TENANT_ID,
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                chatId: currentChatId,
                senderId: currentUserId,
                senderName: message.userName || 'Anonymous',
                content: message.content || message.fileName || '',
                messageType: message.messageType || 'text',
                fileUrl: message.fileUrl,
                fileName: message.fileName,
                fileSize: message.fileSize,
                createdAt: new Date().toISOString(),
                isRead: false
              }

              // Save to database
              await addChatMessage(chatMessage)

              logger.info({
                event: 'ws_message',
                chatId: currentChatId,
                userId: currentUserId,
                messageId: chatMessage.id,
                messageType: chatMessage.messageType
              }, 'Chat message saved')

              // Broadcast to all in chat including sender
              broadcastToChat(currentChatId, {
                type: 'new_message',
                message: chatMessage
              })
            }
            break

          case 'typing':
            if (currentChatId && currentUserId) {
              broadcastToChat(currentChatId, {
                type: 'typing',
                userId: currentUserId,
                userName: message.userName,
                timestamp: new Date().toISOString()
              }, connection.socket)
            }
            break

          case 'read':
            if (currentChatId && message.userId) {
              broadcastToChat(currentChatId, {
                type: 'messages_read',
                userId: message.userId,
                timestamp: new Date().toISOString()
              }, connection.socket)
            }
            break
        }
      } catch (error) {
        logger.error({ err: error, event: 'ws_message_error' }, 'Failed to process WebSocket message')
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }))
      }
    })

    connection.socket.on('close', () => {
      if (currentChatId) {
        leaveChat(currentChatId, connection.socket)

        // Notify others
        broadcastToChat(currentChatId, {
          type: 'user_left',
          userId: currentUserId,
          timestamp: new Date().toISOString()
        })
      }

      logger.info({ event: 'ws_disconnect' }, 'WebSocket client disconnected')
    })

    connection.socket.on('error', (error: Error) => {
      logger.error({ err: error, event: 'ws_error' }, 'WebSocket error')
    })
  })

  console.log('✅ WebSocket registered at /ws/chat')
}

function leaveChat(chatId: string, socket: any) {
  const chatConnections = connections.get(chatId)
  if (chatConnections) {
    chatConnections.delete(socket)
    if (chatConnections.size === 0) {
      connections.delete(chatId)
    }
  }
}

function broadcastToChat(chatId: string, message: any, excludeSocket?: any) {
  const chatConnections = connections.get(chatId)
  if (chatConnections) {
    const payload = JSON.stringify(message)
    chatConnections.forEach((socket) => {
      if (socket !== excludeSocket && socket.readyState === 1) { // 1 = OPEN
        socket.send(payload)
      }
    })
  }
}

// Export for use in other modules (e.g., to notify about order updates)
export function notifyChat(chatId: string, message: any) {
  broadcastToChat(chatId, message)
}

export function getActiveChatConnections(): Map<string, number> {
  const result = new Map<string, number>()
  connections.forEach((sockets, chatId) => {
    result.set(chatId, sockets.size)
  })
  return result
}
