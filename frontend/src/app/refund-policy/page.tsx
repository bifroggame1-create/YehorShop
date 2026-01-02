'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const content = {
  ru: {
    title: 'Возвраты и споры',
    lastUpdated: 'Последнее обновление: Декабрь 2024',
    intro: 'Yehor Shop защищает покупателей через систему escrow и споров. Ваши деньги в безопасности.',
    escrow: {
      title: 'Как работает escrow',
      steps: [
        { num: '1', text: 'Вы оплачиваете товар', icon: '💳' },
        { num: '2', text: 'Деньги замораживаются на escrow', icon: '🔒' },
        { num: '3', text: 'Вы получаете товар', icon: '📦' },
        { num: '4', text: 'После проверки деньги уходят продавцу', icon: '✅' }
      ],
      period: 'Escrow период: 1-7 дней в зависимости от рейтинга продавца'
    },
    refund: {
      title: 'Когда можно вернуть деньги',
      yes: {
        title: 'Возврат возможен',
        items: [
          'Товар не соответствует описанию',
          'Ключ/аккаунт не работает',
          'Товар не доставлен',
          'Дубликат (уже использованный ключ)'
        ]
      },
      no: {
        title: 'Возврат невозможен',
        items: [
          'Передумали покупать',
          'Не понравился товар после использования',
          'Истёк escrow период',
          'Нет доказательств проблемы'
        ]
      }
    },
    dispute: {
      title: 'Как открыть спор',
      steps: [
        'Перейдите в "Мои заказы"',
        'Выберите проблемный заказ',
        'Нажмите "Открыть спор"',
        'Опишите проблему и приложите доказательства',
        'Дождитесь ответа продавца (24 часа)',
        'При необходимости — передача администратору'
      ],
      timing: 'Срок рассмотрения: до 48 часов'
    },
    resolution: {
      title: 'Возможные решения',
      items: [
        { icon: '💰', name: 'Полный возврат', desc: 'Деньги вернутся на баланс' },
        { icon: '🔄', name: 'Замена товара', desc: 'Продавец выдаст новый ключ' },
        { icon: '💵', name: 'Частичный возврат', desc: 'Компенсация части стоимости' },
        { icon: '❌', name: 'Отказ', desc: 'При отсутствии оснований' }
      ]
    },
    tips: {
      title: 'Советы покупателям',
      items: [
        'Проверяйте товар сразу после получения',
        'Сохраняйте скриншоты ошибок',
        'Не используйте товар до проверки',
        'Открывайте спор в пределах escrow периода'
      ]
    },
    footer: 'Нужна помощь? @teddyxsup'
  },
  en: {
    title: 'Refunds and Disputes',
    lastUpdated: 'Last updated: December 2024',
    intro: 'Yehor Shop protects buyers through escrow and dispute system. Your money is safe.',
    escrow: {
      title: 'How escrow works',
      steps: [
        { num: '1', text: 'You pay for the product', icon: '💳' },
        { num: '2', text: 'Money is frozen in escrow', icon: '🔒' },
        { num: '3', text: 'You receive the product', icon: '📦' },
        { num: '4', text: 'After verification, money goes to seller', icon: '✅' }
      ],
      period: 'Escrow period: 1-7 days depending on seller rating'
    },
    refund: {
      title: 'When refund is possible',
      yes: {
        title: 'Refund possible',
        items: [
          'Product doesn\'t match description',
          'Key/account doesn\'t work',
          'Product not delivered',
          'Duplicate (already used key)'
        ]
      },
      no: {
        title: 'Refund not possible',
        items: [
          'Changed your mind',
          'Didn\'t like product after use',
          'Escrow period expired',
          'No proof of problem'
        ]
      }
    },
    dispute: {
      title: 'How to open a dispute',
      steps: [
        'Go to "My Orders"',
        'Select the problematic order',
        'Click "Open Dispute"',
        'Describe the problem and attach proof',
        'Wait for seller response (24 hours)',
        'If needed — escalate to administrator'
      ],
      timing: 'Resolution time: up to 48 hours'
    },
    resolution: {
      title: 'Possible resolutions',
      items: [
        { icon: '💰', name: 'Full refund', desc: 'Money returns to balance' },
        { icon: '🔄', name: 'Product replacement', desc: 'Seller issues new key' },
        { icon: '💵', name: 'Partial refund', desc: 'Partial cost compensation' },
        { icon: '❌', name: 'Rejection', desc: 'If no grounds for refund' }
      ]
    },
    tips: {
      title: 'Tips for buyers',
      items: [
        'Check product immediately after receiving',
        'Save screenshots of errors',
        'Don\'t use product before verification',
        'Open dispute within escrow period'
      ]
    },
    footer: 'Need help? @teddyxsup'
  }
}

export default function RefundPolicyPage() {
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

        {/* Escrow explanation */}
        <div className="bg-gradient-to-r from-accent-cyan/20 to-accent-blue/20 rounded-xl p-5 mb-4">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-4">
            {t.escrow.title}
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {t.escrow.steps.map((step, i) => (
              <div key={i} className="bg-light-card dark:bg-dark-card rounded-lg p-3 text-center">
                <span className="text-2xl mb-1 block">{step.icon}</span>
                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{step.text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary text-center">
            {t.escrow.period}
          </p>
        </div>

        {/* When refund is possible */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <h3 className="font-bold text-green-700 dark:text-green-400 mb-2 text-sm">
              ✅ {t.refund.yes.title}
            </h3>
            <ul className="space-y-1.5">
              {t.refund.yes.items.map((item, i) => (
                <li key={i} className="text-xs text-green-600 dark:text-green-300">• {item}</li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <h3 className="font-bold text-red-700 dark:text-red-400 mb-2 text-sm">
              ❌ {t.refund.no.title}
            </h3>
            <ul className="space-y-1.5">
              {t.refund.no.items.map((item, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-300">• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* How to open dispute */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-4">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-3">
            {t.dispute.title}
          </h2>
          <div className="space-y-2 mb-3">
            {t.dispute.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-accent-cyan text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{step}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-accent-cyan font-medium">
            {t.dispute.timing}
          </p>
        </div>

        {/* Possible resolutions */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-4">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-3">
            {t.resolution.title}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {t.resolution.items.map((item, i) => (
              <div key={i} className="bg-light-bg dark:bg-dark-bg rounded-lg p-3 text-center">
                <span className="text-xl mb-1 block">{item.icon}</span>
                <span className="text-xs font-medium text-light-text dark:text-dark-text block">{item.name}</span>
                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 mb-6">
          <h2 className="font-bold text-amber-800 dark:text-amber-400 mb-2">
            💡 {t.tips.title}
          </h2>
          <ul className="space-y-1.5">
            {t.tips.items.map((item, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300">• {item}</li>
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
