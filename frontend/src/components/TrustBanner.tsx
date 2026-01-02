'use client'

import { useAppStore } from '@/lib/store'
import { LightningFast, ShieldCheck, RefundMoney, StoreFront, Cashback } from './Icons'

const content = {
  ru: {
    headline: 'Цифровые товары с гарантией',
    features: [
      { icon: 'lightning', text: 'Мгновенная доставка' },
      { icon: 'shield', text: 'Escrow защита' },
      { icon: 'refund', text: 'Возврат денег' },
      { icon: 'store', text: 'Открой свой магазин' }
    ],
    stats: {
      orders: '10K+ покупок',
      protection: 'Защита покупателя'
    }
  },
  en: {
    headline: 'Digital goods with guarantee',
    features: [
      { icon: 'lightning', text: 'Instant delivery' },
      { icon: 'shield', text: 'Escrow protection' },
      { icon: 'refund', text: 'Money back' },
      { icon: 'store', text: 'Open your store' }
    ],
    stats: {
      orders: '10K+ orders',
      protection: 'Buyer protection'
    }
  }
}

const icons = {
  lightning: <LightningFast className="w-5 h-5" />,
  shield: <ShieldCheck className="w-5 h-5" />,
  refund: <RefundMoney className="w-5 h-5" />,
  store: <StoreFront className="w-5 h-5" />
}

export default function TrustBanner() {
  const { language } = useAppStore()
  const t = content[language]

  return (
    <div className="bg-gradient-to-r from-accent-cyan/10 to-accent-blue/10 dark:from-accent-cyan/20 dark:to-accent-blue/20 border-b border-light-border dark:border-dark-border">
      <div className="px-4 py-3">
        {/* Headline */}
        <h1 className="text-base font-bold text-light-text dark:text-dark-text mb-2 text-center">
          {t.headline}
        </h1>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs max-w-xs mx-auto">
          {t.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-1.5 text-light-text-secondary dark:text-dark-text-secondary">
              <span className="flex-shrink-0">
                {icons[feature.icon as keyof typeof icons]}
              </span>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Compact inline trust badges for use in other components
export function TrustBadge({ type, size = 'sm' }: { type: 'escrow' | 'instant' | 'guarantee'; size?: 'sm' | 'md' }) {
  const { language } = useAppStore()

  const badgeIcons = {
    escrow: <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
    instant: <LightningFast className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
    guarantee: <Cashback className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
  }

  const badges = {
    escrow: {
      text: { ru: 'Escrow', en: 'Escrow' },
      color: 'bg-green-50 dark:bg-green-900/30'
    },
    instant: {
      text: { ru: 'Мгновенно', en: 'Instant' },
      color: 'bg-yellow-50 dark:bg-yellow-900/30'
    },
    guarantee: {
      text: { ru: 'Гарантия', en: 'Guarantee' },
      color: 'bg-blue-50 dark:bg-blue-900/30'
    }
  }

  const badge = badges[type]
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs gap-1' : 'px-2 py-1 text-sm gap-1.5'

  return (
    <span className={`inline-flex items-center rounded-full font-medium text-light-text dark:text-dark-text ${badge.color} ${sizeClasses}`}>
      {badgeIcons[type]}
      <span>{badge.text[language]}</span>
    </span>
  )
}

// Escrow explanation block for product/checkout pages
export function EscrowExplainer({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { language } = useAppStore()

  const content = {
    ru: {
      title: 'Защита покупателя',
      items: [
        'Товар не работает — замена или возврат',
        'Деньги на escrow до подтверждения',
        'Спор рассматривается за 48 часов'
      ],
      compact: 'Ваши деньги защищены до получения товара'
    },
    en: {
      title: 'Buyer protection',
      items: [
        'Product doesn\'t work — replacement or refund',
        'Money in escrow until confirmation',
        'Disputes resolved within 48 hours'
      ],
      compact: 'Your money is protected until you receive the product'
    }
  }

  const t = content[language]

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-sm text-green-700 dark:text-green-300">{t.compact}</span>
      </div>
    )
  }

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
      <h3 className="font-bold text-light-text dark:text-dark-text mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        {t.title}
      </h3>
      <ul className="space-y-2">
        {t.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
