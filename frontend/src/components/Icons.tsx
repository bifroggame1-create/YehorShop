'use client'

import React from 'react'

// Gold/Premium themed icons (inspired by FintopioGold)
export const GoldCoin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="url(#goldGradient)" />
    <circle cx="12" cy="12" r="8" fill="url(#goldGradient2)" stroke="#B8860B" strokeWidth="0.5" />
    <text x="12" y="16" textAnchor="middle" fill="#8B6914" fontSize="10" fontWeight="bold">$</text>
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FFA500" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
      <linearGradient id="goldGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFEC8B" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
    </defs>
  </svg>
)

export const GoldStar = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L14.9 8.6L22 9.3L17 14.1L18.2 21L12 17.5L5.8 21L7 14.1L2 9.3L9.1 8.6L12 2Z"
      fill="url(#starGold)" stroke="#B8860B" strokeWidth="0.5" />
    <defs>
      <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#FFA500" />
      </linearGradient>
    </defs>
  </svg>
)

export const GoldCrown = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M2 17L4 8L8 12L12 4L16 12L20 8L22 17H2Z"
      fill="url(#crownGold)" stroke="#B8860B" strokeWidth="0.5" />
    <rect x="2" y="17" width="20" height="3" rx="1" fill="url(#crownGold)" stroke="#B8860B" strokeWidth="0.5" />
    <circle cx="4" cy="8" r="1.5" fill="#FFD700" />
    <circle cx="12" cy="4" r="1.5" fill="#FFD700" />
    <circle cx="20" cy="8" r="1.5" fill="#FFD700" />
    <defs>
      <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
    </defs>
  </svg>
)

export const GoldDiamond = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L20 9L12 22L4 9L12 2Z" fill="url(#diamondGold)" stroke="#B8860B" strokeWidth="0.5" />
    <path d="M4 9H20L12 2L4 9Z" fill="url(#diamondTop)" stroke="#B8860B" strokeWidth="0.5" />
    <defs>
      <linearGradient id="diamondGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FFEC8B" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
      <linearGradient id="diamondTop" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFACD" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
    </defs>
  </svg>
)

// Level/Rank badges (inspired by profile_levels)
export const LevelBadge = ({ level = 1, className = "w-6 h-6" }: { level?: number; className?: string }) => {
  const colors = {
    1: { bg: '#CD7F32', text: '#FFF' }, // Bronze
    2: { bg: '#C0C0C0', text: '#333' }, // Silver
    3: { bg: '#FFD700', text: '#333' }, // Gold
    4: { bg: '#E5E4E2', text: '#333' }, // Platinum
    5: { bg: '#B9F2FF', text: '#333' }, // Diamond
  }
  const color = colors[level as keyof typeof colors] || colors[1]

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15 8H21L16.5 12.5L18 20L12 16L6 20L7.5 12.5L3 8H9L12 2Z"
        fill={color.bg} stroke="#000" strokeWidth="0.3" strokeOpacity="0.2" />
      <text x="12" y="14" textAnchor="middle" fill={color.text} fontSize="8" fontWeight="bold">
        {level}
      </text>
    </svg>
  )
}

export const RankShield = ({ rank = 'new', className = "w-5 h-5" }: { rank?: 'new' | 'bronze' | 'silver' | 'gold' | 'diamond'; className?: string }) => {
  const colors = {
    new: '#6B7280',
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    diamond: '#B9F2FF',
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 6V12C20 17 16.5 20.5 12 22C7.5 20.5 4 17 4 12V6L12 2Z"
        fill={colors[rank]} stroke="#000" strokeWidth="0.3" strokeOpacity="0.3" />
      <path d="M9 12L11 14L15 10" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Status icons (animated feel)
export const SuccessCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#10B981" />
    <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const PendingClock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#F59E0B" />
    <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ErrorX = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#EF4444" />
    <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

export const InfoCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#3B82F6" />
    <path d="M12 16V12M12 8H12.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

// Trust/Security icons
export const VerifiedBadge = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L14.5 4.5H18V8L21 10.5L18 13V17H14.5L12 19.5L9.5 17H6V13L3 10.5L6 8V4.5H9.5L12 2Z"
      fill="#3B82F6" />
    <path d="M8 11L11 14L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ShieldCheck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L20 6V12C20 17 16.5 20.5 12 22C7.5 20.5 4 17 4 12V6L12 2Z"
      fill="#10B981" />
    <path d="M8 12L11 15L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const LockSecure = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10" width="14" height="10" rx="2" fill="#6366F1" />
    <path d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10"
      stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.5" fill="white" />
  </svg>
)

// Shopping/Delivery icons
export const LightningFast = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
      fill="url(#lightningGrad)" stroke="#B8860B" strokeWidth="0.5" />
    <defs>
      <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#FFA500" />
      </linearGradient>
    </defs>
  </svg>
)

export const GiftBox = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="10" width="18" height="11" rx="2" fill="#EC4899" />
    <rect x="3" y="6" width="18" height="4" rx="1" fill="#F472B6" />
    <rect x="10.5" y="6" width="3" height="15" fill="#FDE68A" />
    <path d="M12 6C12 6 9 3 7 3C5 3 4 4.5 4 6H12Z" fill="#FDE68A" />
    <path d="M12 6C12 6 15 3 17 3C19 3 20 4.5 20 6H12Z" fill="#FDE68A" />
  </svg>
)

export const ShoppingBag = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M6 6L5 21H19L18 6H6Z" fill="#8B5CF6" />
    <path d="M9 6V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5V6"
      stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 10V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V10"
      stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Crypto/Payment icons
export const CryptoWallet = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2" fill="#1E40AF" />
    <rect x="14" y="10" width="8" height="4" rx="1" fill="#3B82F6" />
    <circle cx="17" cy="12" r="1" fill="white" />
  </svg>
)

export const TonCoin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#0088CC" />
    <path d="M8 8L12 16L16 8H8Z" fill="white" />
    <path d="M12 8V13" stroke="#0088CC" strokeWidth="1.5" />
  </svg>
)

// Fire/Hot icons
export const FireHot = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 8 6 8 10C8 12 9 14 11 15C10 13 10 11 12 9C14 11 14 13 13 15C15 14 16 12 16 10C16 6 12 2 12 2Z"
      fill="url(#fireGrad)" />
    <path d="M12 22C8.5 22 6 19.5 6 16C6 13 8 11 10 10C10 12 11 14 12 15C13 14 14 12 14 10C16 11 18 13 18 16C18 19.5 15.5 22 12 22Z"
      fill="url(#fireGrad2)" />
    <defs>
      <linearGradient id="fireGrad" x1="12" y1="2" x2="12" y2="15">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="fireGrad2" x1="12" y1="10" x2="12" y2="22">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
  </svg>
)

// Rocket/Boost icon
export const RocketBoost = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 7 7 7 14L12 19L17 14C17 7 12 2 12 2Z" fill="#6366F1" />
    <circle cx="12" cy="10" r="2" fill="white" />
    <path d="M7 14L4 17L7 16V14Z" fill="#818CF8" />
    <path d="M17 14L20 17L17 16V14Z" fill="#818CF8" />
    <path d="M10 19L12 22L14 19H10Z" fill="url(#rocketFlame)" />
    <defs>
      <linearGradient id="rocketFlame" x1="12" y1="19" x2="12" y2="22">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
  </svg>
)

// Sparkle/Magic icon
export const Sparkle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
      fill="url(#sparkleGrad)" />
    <path d="M19 2L19.5 4.5L22 5L19.5 5.5L19 8L18.5 5.5L16 5L18.5 4.5L19 2Z"
      fill="#FDE68A" />
    <path d="M5 16L5.5 18.5L8 19L5.5 19.5L5 22L4.5 19.5L2 19L4.5 18.5L5 16Z"
      fill="#FDE68A" />
    <defs>
      <linearGradient id="sparkleGrad" x1="12" y1="2" x2="12" y2="18">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
)

// Heart/Love icon
export const HeartFilled = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z"
      fill="url(#heartGrad)" />
    <defs>
      <linearGradient id="heartGrad" x1="12" y1="3" x2="12" y2="21">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
)

// Money/Cashback icon
export const Cashback = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#10B981" />
    <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 8l-8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
)

// Refund/Money Back icon
export const RefundMoney = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#06B6D4" />
    <path d="M8 12L11 9L11 11L16 11L16 13L11 13L11 15L8 12Z" fill="white" />
    <text x="14" y="16" fontSize="6" fill="white" fontWeight="bold">₽</text>
  </svg>
)

// Store/Shop icon
export const StoreFront = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M4 7L2 12H22L20 7H4Z" fill="#8B5CF6" />
    <path d="M2 12V20C2 21 3 22 4 22H20C21 22 22 21 22 20V12" stroke="#8B5CF6" strokeWidth="2" />
    <rect x="8" y="14" width="8" height="8" rx="1" fill="#A78BFA" />
    <path d="M5 7V4C5 3 6 2 7 2H17C18 2 19 3 19 4V7" stroke="#8B5CF6" strokeWidth="2" />
  </svg>
)

// Percent/Discount icon
export const DiscountTag = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#EF4444" />
    <circle cx="9" cy="9" r="1.5" fill="white" />
    <circle cx="15" cy="15" r="1.5" fill="white" />
    <path d="M9 15L15 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Export all icons as a collection
export const Icons = {
  // Gold/Premium
  GoldCoin,
  GoldStar,
  GoldCrown,
  GoldDiamond,

  // Levels/Ranks
  LevelBadge,
  RankShield,

  // Status
  SuccessCheck,
  PendingClock,
  ErrorX,
  InfoCircle,

  // Trust/Security
  VerifiedBadge,
  ShieldCheck,
  LockSecure,

  // Shopping
  LightningFast,
  GiftBox,
  ShoppingBag,

  // Crypto/Payment
  CryptoWallet,
  TonCoin,

  // Effects
  FireHot,
  RocketBoost,
  Sparkle,
  HeartFilled,
  Cashback,
  RefundMoney,
  StoreFront,
  DiscountTag,
}

export default Icons
