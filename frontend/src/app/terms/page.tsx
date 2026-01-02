'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const content = {
  ru: {
    title: 'Условия использования',
    lastUpdated: 'Последнее обновление: Декабрь 2024',
    sections: [
      {
        title: '1. Общие положения',
        content: `Yehor Shop — это маркетплейс цифровых товаров, работающий через Telegram Mini App. Используя наш сервис, вы соглашаетесь с настоящими условиями.

Платформа предоставляет:
• Площадку для покупки и продажи цифровых товаров
• Безопасные платежи через CryptoBot и банковские карты
• Систему защиты покупателей через escrow
• Автоматическую доставку цифровых товаров`
      },
      {
        title: '2. Учетная запись',
        content: `Для использования Yehor Shop необходим аккаунт Telegram. Вы несете ответственность за:
• Сохранность доступа к вашему аккаунту
• Все действия, совершенные с вашего аккаунта
• Достоверность предоставленной информации

Мы оставляем за собой право заблокировать аккаунты, нарушающие правила платформы.`
      },
      {
        title: '3. Покупки и платежи',
        content: `• Все цены указаны в рублях (₽)
• Оплата возможна криптовалютой (CryptoBot) или картой
• После оплаты средства замораживаются на escrow
• Товар доставляется автоматически после подтверждения оплаты
• Средства переводятся продавцу после подтверждения получения или по истечении escrow-периода`
      },
      {
        title: '4. Возвраты и споры',
        content: `• Возврат возможен если товар не соответствует описанию
• Для возврата необходимо открыть спор в течение escrow-периода
• Споры рассматриваются администрацией в течение 48 часов
• Решение администрации является окончательным

Подробнее о политике возвратов — в разделе "Возвраты и споры".`
      },
      {
        title: '5. Запрещенные товары',
        content: `На Yehor Shop запрещено продавать:
• Нелегальный контент
• Краденые аккаунты и данные
• Вредоносное ПО
• Товары, нарушающие авторские права
• Любые товары, нарушающие законодательство РФ`
      },
      {
        title: '6. Ограничение ответственности',
        content: `Yehor Shop не несет ответственности за:
• Качество товаров, продаваемых продавцами
• Споры между покупателями и продавцами
• Технические сбои на стороне платежных систем
• Потерю доступа к вашему Telegram аккаунту

Мы прилагаем все усилия для обеспечения безопасности сделок, но не можем гарантировать 100% защиту от мошенничества.`
      },
      {
        title: '7. Изменения условий',
        content: `Мы можем изменять настоящие условия в любое время. Продолжение использования сервиса после изменений означает согласие с новыми условиями.`
      }
    ],
    contact: 'По всем вопросам обращайтесь в поддержку: @teddyxsup'
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: December 2024',
    sections: [
      {
        title: '1. General Provisions',
        content: `Yehor Shop is a digital goods marketplace operating through Telegram Mini App. By using our service, you agree to these terms.

The platform provides:
• A marketplace for buying and selling digital goods
• Secure payments via CryptoBot and bank cards
• Buyer protection through escrow system
• Automatic delivery of digital products`
      },
      {
        title: '2. Account',
        content: `A Telegram account is required to use Yehor Shop. You are responsible for:
• Keeping your account access secure
• All actions performed from your account
• Accuracy of provided information

We reserve the right to block accounts that violate platform rules.`
      },
      {
        title: '3. Purchases and Payments',
        content: `• All prices are listed in rubles (₽)
• Payment available via cryptocurrency (CryptoBot) or card
• After payment, funds are frozen in escrow
• Product is delivered automatically after payment confirmation
• Funds are transferred to seller after receipt confirmation or escrow period expiration`
      },
      {
        title: '4. Refunds and Disputes',
        content: `• Refund is possible if product doesn't match description
• To get a refund, open a dispute within escrow period
• Disputes are reviewed by administration within 48 hours
• Administration decision is final

More about refund policy in the "Refunds and Disputes" section.`
      },
      {
        title: '5. Prohibited Goods',
        content: `Selling the following is prohibited on Yehor Shop:
• Illegal content
• Stolen accounts and data
• Malware
• Copyright-infringing goods
• Any goods violating Russian law`
      },
      {
        title: '6. Limitation of Liability',
        content: `Yehor Shop is not responsible for:
• Quality of goods sold by sellers
• Disputes between buyers and sellers
• Technical failures on payment systems' side
• Loss of access to your Telegram account

We make every effort to ensure transaction security, but cannot guarantee 100% fraud protection.`
      },
      {
        title: '7. Changes to Terms',
        content: `We may change these terms at any time. Continued use of the service after changes means agreement to new terms.`
      }
    ],
    contact: 'For all questions, contact support: @teddyxsup'
  }
}

export default function TermsPage() {
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
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
          {t.lastUpdated}
        </p>

        <div className="space-y-6">
          {t.sections.map((section, index) => (
            <div
              key={index}
              className="bg-light-card dark:bg-dark-card rounded-xl p-5 border border-light-border dark:border-dark-border"
            >
              <h2 className="text-lg font-bold text-light-text dark:text-dark-text mb-3">
                {section.title}
              </h2>
              <p className="text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-line text-sm leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-accent-cyan/10 dark:bg-accent-cyan/20 rounded-xl">
          <p className="text-sm text-light-text dark:text-dark-text text-center">
            {t.contact}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
