'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const content = {
  ru: {
    title: 'Частые вопросы',
    categories: [
      {
        name: 'Покупки',
        icon: '🛒',
        questions: [
          {
            q: 'Как купить товар?',
            a: 'Выберите товар, нажмите "Купить", выберите способ оплаты и оплатите. Товар будет доставлен автоматически после подтверждения оплаты.'
          },
          {
            q: 'Какие способы оплаты доступны?',
            a: 'Криптовалюта через CryptoBot и банковские карты через систему быстрых платежей (СБП).'
          },
          {
            q: 'Когда я получу товар?',
            a: 'Большинство товаров доставляются мгновенно после оплаты. Максимальное время ожидания — 30 минут для ручной доставки.'
          },
          {
            q: 'Где посмотреть купленные товары?',
            a: 'В разделе "Мои заказы" в вашем профиле. Там же хранятся ключи и данные для активации.'
          }
        ]
      },
      {
        name: 'Оплата',
        icon: '💳',
        questions: [
          {
            q: 'Безопасно ли платить?',
            a: 'Да! Все платежи защищены системой escrow. Ваши деньги замораживаются до подтверждения получения товара.'
          },
          {
            q: 'Что такое escrow?',
            a: 'Escrow — это система защиты сделок. Деньги хранятся на платформе и переводятся продавцу только после успешной доставки товара.'
          },
          {
            q: 'Можно ли оплатить в рублях?',
            a: 'Да, через банковскую карту или СБП. Криптоплатежи также доступны через CryptoBot.'
          }
        ]
      },
      {
        name: 'Возвраты',
        icon: '↩️',
        questions: [
          {
            q: 'Как вернуть деньги?',
            a: 'Откройте спор в течение escrow-периода через раздел "Мои заказы". Опишите проблему и приложите доказательства.'
          },
          {
            q: 'Сколько времени занимает возврат?',
            a: 'Споры рассматриваются в течение 48 часов. При положительном решении деньги возвращаются на баланс.'
          },
          {
            q: 'Что делать если ключ не работает?',
            a: 'Сразу откройте спор с описанием ошибки и скриншотом. Продавец обязан заменить нерабочий ключ.'
          }
        ]
      },
      {
        name: 'Аккаунт',
        icon: '👤',
        questions: [
          {
            q: 'Как зарегистрироваться?',
            a: 'Регистрация автоматическая при первом входе через Telegram. Дополнительных действий не требуется.'
          },
          {
            q: 'Как получить бонусы?',
            a: 'Приглашайте друзей по реферальной ссылке. Вы получите 200₽ за каждого друга, а друг — 100₽ на баланс.'
          },
          {
            q: 'Можно ли использовать бонусы?',
            a: 'Да! Бонусный баланс можно использовать при оплате любого товара.'
          }
        ]
      }
    ],
    notFound: {
      title: 'Не нашли ответ?',
      text: 'Напишите в поддержку, мы поможем!',
      button: 'Написать в поддержку'
    }
  },
  en: {
    title: 'FAQ',
    categories: [
      {
        name: 'Purchases',
        icon: '🛒',
        questions: [
          {
            q: 'How do I buy a product?',
            a: 'Select a product, click "Buy", choose payment method and pay. Product will be delivered automatically after payment confirmation.'
          },
          {
            q: 'What payment methods are available?',
            a: 'Cryptocurrency via CryptoBot and bank cards via Fast Payment System (SBP).'
          },
          {
            q: 'When will I receive the product?',
            a: 'Most products are delivered instantly after payment. Maximum waiting time is 30 minutes for manual delivery.'
          },
          {
            q: 'Where can I see purchased products?',
            a: 'In the "My Orders" section in your profile. Keys and activation data are stored there as well.'
          }
        ]
      },
      {
        name: 'Payment',
        icon: '💳',
        questions: [
          {
            q: 'Is it safe to pay?',
            a: 'Yes! All payments are protected by escrow system. Your money is frozen until product receipt is confirmed.'
          },
          {
            q: 'What is escrow?',
            a: 'Escrow is a transaction protection system. Money is held on the platform and transferred to seller only after successful delivery.'
          },
          {
            q: 'Can I pay in rubles?',
            a: 'Yes, via bank card or SBP. Crypto payments are also available via CryptoBot.'
          }
        ]
      },
      {
        name: 'Refunds',
        icon: '↩️',
        questions: [
          {
            q: 'How do I get a refund?',
            a: 'Open a dispute within escrow period through "My Orders" section. Describe the problem and attach proof.'
          },
          {
            q: 'How long does refund take?',
            a: 'Disputes are reviewed within 48 hours. If approved, money returns to your balance.'
          },
          {
            q: 'What if the key doesn\'t work?',
            a: 'Immediately open a dispute with error description and screenshot. Seller must replace non-working key.'
          }
        ]
      },
      {
        name: 'Account',
        icon: '👤',
        questions: [
          {
            q: 'How do I register?',
            a: 'Registration is automatic on first login via Telegram. No additional steps required.'
          },
          {
            q: 'How do I get bonuses?',
            a: 'Invite friends via referral link. You get 200₽ for each friend, and friend gets 100₽ bonus.'
          },
          {
            q: 'Can I use bonuses?',
            a: 'Yes! Bonus balance can be used when paying for any product.'
          }
        ]
      }
    ],
    notFound: {
      title: 'Didn\'t find an answer?',
      text: 'Contact support, we\'ll help!',
      button: 'Contact Support'
    }
  }
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-light-border dark:border-dark-border last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium text-light-text dark:text-dark-text pr-4">
          {question}
        </span>
        <svg
          className={`w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <p className="pb-4 text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  )
}

export default function FAQPage() {
  const router = useRouter()
  const { language } = useAppStore()
  const t = content[language]
  const [activeCategory, setActiveCategory] = useState(0)

  const openSupport = () => {
    window.open('https://t.me/teddyxsup', '_blank')
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title={t.title}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {t.categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeCategory === i
                  ? 'bg-accent-cyan text-white'
                  : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="font-medium text-sm">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border px-4 mb-6">
          {t.categories[activeCategory].questions.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>

        {/* Not found */}
        <div className="bg-gradient-to-r from-accent-cyan/20 to-accent-blue/20 rounded-xl p-5 text-center">
          <h3 className="font-bold text-light-text dark:text-dark-text mb-2">
            {t.notFound.title}
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
            {t.notFound.text}
          </p>
          <button
            onClick={openSupport}
            className="px-6 py-2.5 bg-accent-cyan text-white rounded-lg font-medium transition-all active:scale-[0.98]"
          >
            {t.notFound.button}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
