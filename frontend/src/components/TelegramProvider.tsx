'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { initTelegramWebApp, getTelegramUser, getTelegramStartParam } from '@/lib/telegram'
import { userApi, referralApi } from '@/lib/api'

// Parse referral ID from start_param (format: ref_USER_ID)
const parseReferrerId = (startParam: string | null): string | null => {
  if (!startParam) return null
  if (startParam.startsWith('ref_')) {
    return startParam.substring(4) // Remove 'ref_' prefix
  }
  return null
}

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  const { setUser, addNotification } = useAppStore()

  useEffect(() => {
    initTelegramWebApp()

    const loadUser = async () => {
      const telegramUser = getTelegramUser()
      const startParam = getTelegramStartParam() // Реферальный код из start param
      const referrerId = parseReferrerId(startParam)

      if (telegramUser) {
        try {
          // Создаем пользователя из Telegram данных
          const userData = {
            id: telegramUser.id,
            username: telegramUser.username,
            name: telegramUser.name, // Используем имя из Telegram (first_name + last_name)
            avatar: telegramUser.avatar || `https://i.pravatar.cc/150?u=${telegramUser.id}`,
            joinedAt: new Date().toISOString(),
            referredBy: referrerId || undefined, // Передаем реферальный код, если есть
            stats: {
              rating: 0,
              reviewsCount: 0,
              ordersCount: 0,
              returnsCount: 0,
            },
          }

          const user = await userApi.create(userData)
          setUser(user)

          // Track referral if user came via referral link
          if (referrerId && referrerId !== telegramUser.id) {
            try {
              const result = await referralApi.trackReferral({
                userId: telegramUser.id,
                referrerId: referrerId
              })

              // If referral was successful and user got bonus
              if (result.success && result.bonusAwarded) {
                addNotification(
                  'Бонус за регистрацию!',
                  `Вы получили ${result.bonusAwarded}₽ за регистрацию по приглашению`,
                  'referral'
                )
              }
            } catch (e) {
              // Referral tracking failed, but user creation succeeded
              console.log('Referral tracking failed:', e)
            }
          }
        } catch (error) {
          console.error('Error loading user:', error)
          // Fallback: set user directly without API call
          setUser({
            id: telegramUser.id,
            username: telegramUser.username,
            name: telegramUser.name, // Используем имя из Telegram (first_name + last_name)
            avatar: telegramUser.avatar || `https://i.pravatar.cc/150?u=${telegramUser.id}`,
            joinedAt: new Date().toISOString(),
            stats: {
              rating: 0,
              reviewsCount: 0,
              ordersCount: 0,
              returnsCount: 0,
            },
          })
        }
      } else {
        // Development mode - use mock user with username
        const mockUser = {
          id: 'dev_user',
          username: 'devuser',
          name: 'Dev User', // Имя разработчика для тестирования
          avatar: 'https://i.pravatar.cc/150?u=dev_user',
          joinedAt: new Date().toISOString(),
          referralCode: 'FASTPAYDEV',
          referralCount: 0,
          bonusBalance: 100,
          stats: {
            rating: 0,
            reviewsCount: 0,
            ordersCount: 0,
            returnsCount: 0,
          },
        }
        setUser(mockUser)
      }
    }

    loadUser()
  }, [setUser])

  return <>{children}</>
}
