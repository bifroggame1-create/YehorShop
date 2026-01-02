'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { chatApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getTelegramUser } from '@/lib/telegram'

interface ChatInfo {
  id: string
  participants: string[]
  productId?: string
  productName?: string
  createdAt: string
  lastMessageAt?: string
}

export default function ChatsPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatInfo[]>([])
  const [loading, setLoading] = useState(true)

  const user = getTelegramUser()
  const userId = user?.id?.toString() || ''

  useEffect(() => {
    loadChats()
  }, [userId])

  const loadChats = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const res = await chatApi.getUserChats(userId)
      if (res.success) {
        setChats(res.chats || [])
      }
    } catch (err) {
      console.error('Failed to load chats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header title="Чаты" showBack onBack={() => router.back()} showNavButtons={false} />

      <div className="px-4 py-4">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Нет чатов</h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-xs">
              Напишите продавцу на странице товара, чтобы начать диалог
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border hover:border-accent-cyan transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-light-bg dark:bg-dark-bg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-light-text dark:text-dark-text truncate">
                      {chat.productName || 'Чат'}
                    </h3>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary ml-2 flex-shrink-0">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                    Нажмите, чтобы открыть чат
                  </p>
                </div>

                <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
