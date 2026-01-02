'use client'

import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { useState } from 'react'
import LanguageCurrencyModal from './LanguageCurrencyModal'
import AnimatedTreeLogo from './AnimatedTreeLogo'
import SnowEffect from './SnowEffect'
import { t } from '@/lib/i18n'

interface HeaderProps {
  title?: string
  logo?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  showNavButtons?: boolean
  showCart?: boolean
}

export default function Header({ title, logo, showBack, onBack, rightAction, showNavButtons = true, showCart = true }: HeaderProps) {
  const { unreadChats, language, currency, getCartItemCount } = useAppStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const cartCount = getCartItemCount()

  return (
    <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-bg border-b border-light-border dark:border-dark-border px-4 py-3 relative overflow-hidden">
      {/* Снег на фоне с пониженной яркостью */}
      <SnowEffect density={30} className="opacity-30" />

      <div className="flex items-center justify-between relative z-10">
        {/* Left side - Logo */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <img
              src="/Yehor.png"
              alt="Yehor Shop"
              className="h-10 w-auto object-contain rounded-lg"
            />
          )}
        </div>

        {/* Center - Tree Logo or Title */}
        <div className="flex-1 flex items-center justify-center">
          {title ? (
            <h1 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h1>
          ) : (
            <AnimatedTreeLogo />
          )}
        </div>

        {/* Right side - Support, Chat buttons and Actions */}
        <div className="flex items-center gap-2 justify-end">
          {showNavButtons && (
            <>
              <Link
                href="/support"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline">{t('support', language)}</span>
              </Link>
              <Link
                href="/chats"
                className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="hidden sm:inline">{t('chats', language)}</span>
                {unreadChats > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
              >
                <span className="font-medium">{language === 'ru' ? '🇷🇺' : '🇺🇸'}</span>
                <span className="font-medium">{currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : '€'}</span>
              </button>
            </>
          )}
          {showCart && (
            <Link
              href="/cart"
              className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text hover:border-accent-cyan transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-cyan text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}
          {rightAction}
        </div>
      </div>

      <LanguageCurrencyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  )
}
