'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { initAuth, isAdmin as checkIsAdmin, getUser } from '@/lib/auth'
import { getTelegramUser } from '@/lib/telegram'

// Hardcoded admin IDs - always show admin panel for these users
const ADMIN_IDS = ['8588913643', '1301598469']

export default function BottomNav() {
  const pathname = usePathname()
  const { isAdmin: storeIsAdmin, setIsAdmin } = useAppStore()
  const [localIsAdmin, setLocalIsAdmin] = useState(false)

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      // Check hardcoded admin IDs first
      const tgUser = getTelegramUser()
      if (tgUser && ADMIN_IDS.includes(tgUser.id)) {
        setLocalIsAdmin(true)
        setIsAdmin(true)
        return
      }

      const user = await initAuth()

      if (user) {
        // Also check if user ID is in hardcoded list
        const isHardcodedAdmin = ADMIN_IDS.includes(user.id)
        setLocalIsAdmin(user.isAdmin || isHardcodedAdmin)
        setIsAdmin(user.isAdmin || isHardcodedAdmin)
      } else {
        // Fallback: check stored status
        const adminStatus = checkIsAdmin()
        setLocalIsAdmin(adminStatus)
        setIsAdmin(adminStatus)
      }
    }

    init()
  }, [setIsAdmin])

  // Use local state as primary, fall back to store
  const isAdmin = localIsAdmin || storeIsAdmin

  const navItems = [
    {
      name: 'Маркет',
      path: '/',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Избранное',
      path: '/favorites',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Профиль',
      path: '/profile',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ]

  // Add admin tab for admins
  if (isAdmin) {
    navItems.push({
      name: 'Админ',
      path: '/admin',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-light-card dark:bg-dark-bg border-t border-light-border dark:border-dark-border">
      <div className="flex justify-around items-center h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                isActive ? 'text-accent-cyan' : 'text-light-text-secondary dark:text-dark-text-secondary'
              }`}
            >
              {item.icon(isActive)}
              <span className="text-xs">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
