'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { authenticate, getAuthUser, AuthUser } from '@/lib/auth'
import { initTelegramWebApp, getTelegramUser, getTelegramStartParam } from '@/lib/telegram'
import { useAppStore } from '@/lib/store'
import { userApi, referralApi } from '@/lib/api'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false
})

export function useAuth() {
  return useContext(AuthContext)
}

// Parse referral ID from start_param (format: ref_USER_ID)
const parseReferrerId = (startParam: string | null): string | null => {
  if (!startParam) return null
  if (startParam.startsWith('ref_')) {
    return startParam.substring(4)
  }
  return null
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { setUser, addNotification } = useAppStore()

  useEffect(() => {
    const init = async () => {
      // Initialize Telegram WebApp
      initTelegramWebApp()

      // Authenticate with backend
      try {
        const success = await authenticate()
        if (success) {
          const user = getAuthUser()
          setAuthUser(user)
        }
      } catch (e) {
        console.error('Auth initialization error:', e)
      }

      // Load user data
      await loadUserData()

      setIsLoading(false)
    }

    init()
  }, [])

  const loadUserData = async () => {
    const telegramUser = getTelegramUser()
    const startParam = getTelegramStartParam()
    const referrerId = parseReferrerId(startParam)

    if (telegramUser) {
      try {
        const userData = {
          id: telegramUser.id,
          username: telegramUser.username,
          name: telegramUser.name,
          avatar: telegramUser.avatar || `https://i.pravatar.cc/150?u=${telegramUser.id}`,
          joinedAt: new Date().toISOString(),
          referredBy: referrerId || undefined,
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

            if (result.success && result.bonusAwarded) {
              addNotification(
                'Бонус за регистрацию!',
                `Вы получили ${result.bonusAwarded}₽ за регистрацию по приглашению`,
                'referral'
              )
            }
          } catch (e) {
            console.log('Referral tracking failed:', e)
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
        // Fallback
        setUser({
          id: telegramUser.id,
          username: telegramUser.username,
          name: telegramUser.name,
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
      // Development mode - use mock user
      const mockUser = {
        id: 'dev_user',
        username: 'devuser',
        name: 'Dev User',
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

  return (
    <AuthContext.Provider value={{ user: authUser, isLoading, isAuthenticated: !!authUser }}>
      {children}
    </AuthContext.Provider>
  )
}
