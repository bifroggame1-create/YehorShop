'use client'

import { useAppStore } from '@/lib/store'

export type SellerBadgeType = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky'

interface SellerBadgeProps {
  badge: SellerBadgeType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const badgeConfig: Record<SellerBadgeType, {
  icon: React.ReactNode
  label: { ru: string; en: string }
  color: string
  bgColor: string
  glowColor: string
  animation: string
  description: { ru: string; en: string }
}> = {
  new: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    ),
    label: { ru: 'Новичок', en: 'Newcomer' },
    color: 'text-emerald-500',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/40',
    glowColor: 'shadow-emerald-500/30',
    animation: 'animate-pulse',
    description: { ru: 'Новый продавец на платформе', en: 'New seller on the platform' }
  },
  trusted: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
      </svg>
    ),
    label: { ru: 'Надежный', en: 'Trusted' },
    color: 'text-blue-500',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40',
    glowColor: 'shadow-blue-500/40',
    animation: 'hover:animate-bounce',
    description: { ru: 'Проверенный продавец с хорошей историей', en: 'Verified seller with good history' }
  },
  verified: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-lg">
        <defs>
          <linearGradient id="verifiedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <path fill="url(#verifiedGradient)" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307z"/>
        <path fill="white" d="M15.61 10.186a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"/>
      </svg>
    ),
    label: { ru: 'Верифицирован', en: 'Verified' },
    color: 'text-cyan-500',
    bgColor: 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/40 dark:to-blue-900/40',
    glowColor: 'shadow-cyan-500/50',
    animation: 'animate-[wiggle_1s_ease-in-out_infinite]',
    description: { ru: 'Личность продавца подтверждена', en: 'Seller identity confirmed' }
  },
  top_seller: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-xl">
        <defs>
          <linearGradient id="topSellerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path fill="url(#topSellerGradient)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    label: { ru: 'Топ-продавец', en: 'Top Seller' },
    color: 'text-amber-500',
    bgColor: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/40',
    glowColor: 'shadow-amber-500/60',
    animation: 'animate-[spin_3s_linear_infinite]',
    description: { ru: 'Один из лучших продавцов платформы', en: 'One of the top sellers on the platform' }
  },
  high_volume: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
        <defs>
          <linearGradient id="highVolumeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path fill="url(#highVolumeGradient)" d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
        <circle fill="url(#highVolumeGradient)" cx="19" cy="5" r="3" className="animate-ping opacity-75"/>
        <circle fill="#a855f7" cx="19" cy="5" r="2"/>
      </svg>
    ),
    label: { ru: 'Большой объем', en: 'High Volume' },
    color: 'text-purple-500',
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/40 dark:to-violet-900/40',
    glowColor: 'shadow-purple-500/50',
    animation: 'animate-[pulse_2s_ease-in-out_infinite]',
    description: { ru: 'Более 100 успешных продаж', en: 'Over 100 successful sales' }
  },
  risky: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-md">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
    ),
    label: { ru: 'Риск', en: 'Risky' },
    color: 'text-red-500',
    bgColor: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/40 dark:to-rose-900/40',
    glowColor: 'shadow-red-500/50',
    animation: 'animate-[pulse_0.5s_ease-in-out_infinite]',
    description: { ru: 'Были проблемы с заказами', en: 'Had issues with orders' }
  }
}

export default function SellerBadge({ badge, size = 'md', showLabel = false }: SellerBadgeProps) {
  const { language } = useAppStore()
  const config = badgeConfig[badge]

  if (!config) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const paddingClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5'
  }

  if (showLabel) {
    return (
      <div
        className={`
          inline-flex items-center gap-1.5
          ${config.bgColor} ${paddingClasses[size]}
          rounded-full border border-white/20 dark:border-white/10
          shadow-md ${config.glowColor}
          transition-all duration-300 hover:scale-105 hover:shadow-lg
          backdrop-blur-sm
        `}
        title={config.description[language]}
      >
        <span className={`${sizeClasses[size]} ${config.color} ${config.animation}`}>
          {config.icon}
        </span>
        <span className={`${labelSizeClasses[size]} ${config.color} font-semibold tracking-tight`}>
          {config.label[language]}
        </span>
      </div>
    )
  }

  return (
    <span
      className={`
        ${sizeClasses[size]} ${config.color}
        inline-flex items-center justify-center
        ${config.animation}
        transition-transform duration-300 hover:scale-125
        cursor-pointer
      `}
      title={`${config.label[language]}: ${config.description[language]}`}
    >
      {config.icon}
    </span>
  )
}

// Component to display multiple badges
interface SellerBadgesProps {
  badges: SellerBadgeType[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  maxVisible?: number
}

export function SellerBadges({ badges, size = 'md', showLabels = false, maxVisible = 5 }: SellerBadgesProps) {
  // Filter out 'risky' badge for public display (admin only)
  const visibleBadges = badges.filter(b => b !== 'risky').slice(0, maxVisible)

  if (visibleBadges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleBadges.map((badge, index) => (
        <div
          key={badge}
          className="transform transition-all duration-300"
          style={{
            animationDelay: `${index * 100}ms`,
            animation: 'fadeInUp 0.5s ease-out forwards'
          }}
        >
          <SellerBadge badge={badge} size={size} showLabel={showLabels} />
        </div>
      ))}
    </div>
  )
}

// Seller rating display with animated stars
interface SellerRatingProps {
  rating: number // 0-100 score
  ratingCount?: number
  size?: 'sm' | 'md' | 'lg'
}

export function SellerRating({ rating, ratingCount, size = 'md' }: SellerRatingProps) {
  const { language } = useAppStore()

  // Convert 0-100 score to percentage for display
  const percentage = Math.round(rating)

  // Determine color based on rating
  const getColor = () => {
    if (rating >= 90) return 'text-green-500'
    if (rating >= 70) return 'text-amber-500'
    if (rating >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getGlow = () => {
    if (rating >= 90) return 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
    if (rating >= 70) return 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]'
    if (rating >= 50) return 'drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]'
    return 'drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]'
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex items-center gap-1.5">
      <svg
        className={`${iconSizes[size]} ${getColor()} ${getGlow()} transition-all duration-300 hover:scale-110`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
      </svg>
      <span className={`${sizeClasses[size]} font-bold ${getColor()} transition-colors duration-300`}>
        {percentage}%
      </span>
      {ratingCount !== undefined && (
        <span className={`${sizeClasses[size]} text-light-text-secondary dark:text-dark-text-secondary`}>
          ({ratingCount} {language === 'ru' ? 'оценок' : 'ratings'})
        </span>
      )}
    </div>
  )
}
