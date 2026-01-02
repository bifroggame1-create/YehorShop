'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { chatApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getTelegramUser } from '@/lib/telegram'

// API URL for file uploads
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://yehorshop.onrender.com').replace(/\/+$/, '')

interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName?: string
  content: string
  messageType?: 'text' | 'image' | 'file'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isRead?: boolean
  createdAt: string
}

interface ChatInfo {
  id: string
  participants: string[]
  productId?: string
  productName?: string
  createdAt: string
  lastMessageAt?: string
}

export default function ChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = getTelegramUser()
  const userId = user?.id?.toString() || 'anonymous'
  const userName = user?.name || 'Пользователь'

  // Load chat and messages
  useEffect(() => {
    loadChat()
  }, [chatId])

  const loadChat = async () => {
    try {
      setLoading(true)
      setError(null)

      const [chatRes, messagesRes] = await Promise.all([
        chatApi.getChat(chatId),
        chatApi.getMessages(chatId)
      ])

      if (chatRes.success) {
        setChat(chatRes.chat)
      } else {
        setError('Чат не найден')
      }

      if (messagesRes.success) {
        setMessages(messagesRes.messages || [])
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
      setError('Не удалось загрузить чат')
    } finally {
      setLoading(false)
    }
  }

  // Poll for new messages (using HTTP instead of WebSocket for compatibility)
  useEffect(() => {
    if (!chat || !userId) return

    let pollInterval: NodeJS.Timeout | null = null

    const pollMessages = async () => {
      try {
        const res = await chatApi.getMessages(chatId)
        if (res.success && res.messages) {
          setMessages(prev => {
            // Only update if there are new messages
            if (res.messages.length !== prev.length) {
              return res.messages
            }
            return prev
          })
        }
      } catch (err) {
        // Silent fail for polling
      }
    }

    // Poll every 3 seconds for new messages
    pollInterval = setInterval(pollMessages, 3000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [chat, chatId, userId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Send text message via REST API
  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return

    const content = messageText.trim()
    setMessageText('')
    setSending(true)

    try {
      const res = await chatApi.sendMessage(chatId, {
        senderId: userId,
        senderName: userName,
        content,
        messageType: 'text'
      })
      if (res.success && res.message) {
        setMessages(prev => [...prev, res.message])
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessageText(content) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || uploading) return

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Максимальный размер файла: 10MB')
      return
    }

    setUploading(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string

        try {
          const res = await chatApi.uploadFile(chatId, {
            file: base64,
            fileName: file.name,
            fileType: file.type,
            senderId: userId,
            senderName: userName
          })

          if (res.success) {
            setMessages(prev => [...prev, res.message])
          }
        } catch (err) {
          console.error('Failed to upload file:', err)
          alert('Не удалось загрузить файл')
        } finally {
          setUploading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('File read error:', err)
      setUploading(false)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru })
    } catch {
      return ''
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isMyMessage = (senderId: string) => {
    return senderId === userId
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
            {error || 'Чат не найден'}
          </p>
          <button
            onClick={() => router.push('/chats')}
            className="px-6 py-2 bg-accent-cyan text-white rounded-xl"
          >
            К списку чатов
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">
      <Header
        title={chat.productName || 'Чат'}
        showBack
        onBack={() => router.push('/chats')}
        showNavButtons={false}
      />

      {/* Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Начните диалог с продавцом
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${isMyMessage(message.senderId) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    isMyMessage(message.senderId)
                      ? 'bg-accent-cyan text-white rounded-br-md'
                      : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-bl-md border border-light-border dark:border-dark-border'
                  }`}
                >
                  {!isMyMessage(message.senderId) && message.senderName && (
                    <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                  )}

                  {/* Image message */}
                  {message.messageType === 'image' && message.fileUrl && (
                    <div className="mb-2">
                      <img
                        src={message.fileUrl}
                        alt={message.fileName || 'Image'}
                        className="max-w-full rounded-lg cursor-pointer"
                        onClick={() => window.open(message.fileUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* File message */}
                  {message.messageType === 'file' && message.fileUrl && (
                    <a
                      href={message.fileUrl}
                      download={message.fileName}
                      className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${
                        isMyMessage(message.senderId)
                          ? 'bg-white/20'
                          : 'bg-light-bg dark:bg-dark-bg'
                      }`}
                    >
                      <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{message.fileName}</p>
                        <p className="text-xs opacity-70">{formatFileSize(message.fileSize)}</p>
                      </div>
                    </a>
                  )}

                  {/* Text content */}
                  {message.messageType !== 'image' && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}

                  <p className={`text-xs mt-1 ${isMyMessage(message.senderId) ? 'opacity-70' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border">
        <div className="flex gap-2 items-end">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 rounded-xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Message input */}
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Введите сообщение..."
            className="flex-1 px-4 py-3 rounded-xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
          />

          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sending}
            className="px-4 py-3 bg-accent-cyan text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {sending ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
