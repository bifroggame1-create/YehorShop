'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const content = {
  ru: {
    title: 'Правила для продавцов',
    lastUpdated: 'Последнее обновление: Декабрь 2024',
    intro: 'Став продавцом на Yehor Shop, вы соглашаетесь соблюдать следующие правила:',
    sections: [
      {
        title: 'Требования к товарам',
        items: [
          'Только цифровые товары (ключи, аккаунты, подписки, ПО)',
          'Товар должен соответствовать описанию',
          'Запрещены краденые данные и нелегальный контент',
          'Рабочие ключи/аккаунты на момент продажи'
        ]
      },
      {
        title: 'Доставка',
        items: [
          'Автоматическая доставка — приоритет',
          'Ручная доставка — в течение 30 минут',
          'Уведомление покупателя после доставки',
          'Инструкции по активации обязательны'
        ]
      },
      {
        title: 'Споры и возвраты',
        items: [
          'Ответ на спор — в течение 24 часов',
          'Замена нерабочего ключа — обязательна',
          'Возврат при невозможности замены',
          'Игнорирование споров = автовозврат'
        ]
      },
      {
        title: 'Комиссия',
        items: [
          'Комиссия платформы: 5% с продажи',
          'Escrow период: 1-7 дней (зависит от рейтинга)',
          'Вывод: после окончания escrow',
          'Минимальный вывод: 500₽'
        ]
      }
    ],
    badges: {
      title: 'Система бейджей',
      items: [
        { name: 'Новичок', desc: 'Новый продавец, escrow 7 дней', color: 'bg-gray-500' },
        { name: 'Надежный', desc: '50+ продаж, escrow 3 дня', color: 'bg-blue-500' },
        { name: 'Верифицирован', desc: 'Подтвержденный продавец, escrow 1 день', color: 'bg-cyan-500' },
        { name: 'Топ-продавец', desc: 'Рейтинг 95%+, приоритет в выдаче', color: 'bg-yellow-500' }
      ]
    },
    violations: {
      title: 'Нарушения и санкции',
      items: [
        'Продажа нерабочих товаров — предупреждение',
        'Повторные жалобы — снижение рейтинга',
        'Мошенничество — бан + заморозка средств',
        'Нелегальный контент — немедленный бан'
      ]
    },
    footer: 'Вопросы? Пишите @teddyxsup'
  },
  en: {
    title: 'Seller Rules',
    lastUpdated: 'Last updated: December 2024',
    intro: 'By becoming a seller on Yehor Shop, you agree to follow these rules:',
    sections: [
      {
        title: 'Product Requirements',
        items: [
          'Digital goods only (keys, accounts, subscriptions, software)',
          'Product must match description',
          'Stolen data and illegal content prohibited',
          'Working keys/accounts at time of sale'
        ]
      },
      {
        title: 'Delivery',
        items: [
          'Automatic delivery is priority',
          'Manual delivery within 30 minutes',
          'Notify buyer after delivery',
          'Activation instructions required'
        ]
      },
      {
        title: 'Disputes and Refunds',
        items: [
          'Respond to dispute within 24 hours',
          'Replace non-working key — mandatory',
          'Refund if replacement impossible',
          'Ignoring disputes = auto-refund'
        ]
      },
      {
        title: 'Commission',
        items: [
          'Platform fee: 5% per sale',
          'Escrow period: 1-7 days (based on rating)',
          'Withdrawal: after escrow ends',
          'Minimum withdrawal: 500₽'
        ]
      }
    ],
    badges: {
      title: 'Badge System',
      items: [
        { name: 'Newcomer', desc: 'New seller, 7-day escrow', color: 'bg-gray-500' },
        { name: 'Trusted', desc: '50+ sales, 3-day escrow', color: 'bg-blue-500' },
        { name: 'Verified', desc: 'Confirmed seller, 1-day escrow', color: 'bg-cyan-500' },
        { name: 'Top Seller', desc: '95%+ rating, priority listing', color: 'bg-yellow-500' }
      ]
    },
    violations: {
      title: 'Violations and Sanctions',
      items: [
        'Selling non-working products — warning',
        'Repeated complaints — rating decrease',
        'Fraud — ban + frozen funds',
        'Illegal content — immediate ban'
      ]
    },
    footer: 'Questions? Contact @teddyxsup'
  }
}

export default function SellerRulesPage() {
  const router = useRouter()
  const { language } = useAppStore()
  const t = content[language]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title={t.title}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
          {t.lastUpdated}
        </p>
        <p className="text-light-text dark:text-dark-text mb-6">
          {t.intro}
        </p>

        {/* Main sections */}
        <div className="space-y-4 mb-6">
          {t.sections.map((section, index) => (
            <div
              key={index}
              className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
            >
              <h2 className="font-bold text-light-text dark:text-dark-text mb-3">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    <span className="text-accent-cyan mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Badges section */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-4">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-3">
            {t.badges.title}
          </h2>
          <div className="space-y-3">
            {t.badges.items.map((badge, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${badge.color}`}></div>
                <div>
                  <span className="font-medium text-light-text dark:text-dark-text">{badge.name}</span>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary"> — {badge.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violations section */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 mb-6">
          <h2 className="font-bold text-red-800 dark:text-red-400 mb-3">
            {t.violations.title}
          </h2>
          <ul className="space-y-2">
            {t.violations.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <span className="mt-0.5">⚠️</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-accent-cyan/10 dark:bg-accent-cyan/20 rounded-xl">
          <p className="text-sm text-light-text dark:text-dark-text text-center">
            {t.footer}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
