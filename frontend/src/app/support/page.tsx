'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const faqItems = [
  {
    question: 'Как оплатить заказ?',
    answer: 'Мы принимаем оплату через CryptoBot (TON, USDT), QR код СБП и банковские карты. Выберите удобный способ на странице оформления заказа.'
  },
  {
    question: 'Как долго ждать доставку?',
    answer: 'Цифровые товары доставляются мгновенно после подтверждения оплаты. Обычно это занимает от 1 до 5 минут.'
  },
  {
    question: 'Что делать если товар не работает?',
    answer: 'Свяжитесь с нами через форму ниже или напишите продавцу в чате. Мы гарантируем возврат средств или замену товара.'
  },
  {
    question: 'Как работает реферальная программа?',
    answer: 'Приглашайте друзей по своей реферальной ссылке. Вы получите 200₽ бонусов за каждого приглашенного, а друг получит 100₽ на первую покупку.'
  },
  {
    question: 'Можно ли вернуть товар?',
    answer: 'Да, если товар не соответствует описанию или не работает. Напишите в поддержку в течение 24 часов после покупки.'
  }
]

export default function SupportPage() {
  const router = useRouter()
  const { user, addChat, addMessage } = useAppStore()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: ''
  })

  const handleSubmitTicket = () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) return

    const chatId = `support-${Date.now()}`

    // Create support chat
    addChat({
      id: chatId,
      type: 'support',
      title: `Обращение: ${contactForm.subject}`,
      lastMessage: contactForm.message,
      lastMessageTime: new Date().toISOString(),
      unread: 0
    })

    // Add user message
    addMessage({
      id: `msg-${Date.now()}`,
      chatId,
      senderId: user?.id || 'user',
      senderName: user?.name || 'Вы',
      text: contactForm.message,
      timestamp: new Date().toISOString(),
      type: 'text'
    })

    // Add auto-reply from support
    setTimeout(() => {
      addMessage({
        id: `msg-${Date.now() + 1}`,
        chatId,
        senderId: 'support',
        senderName: 'Поддержка Yehor Shop',
        text: 'Спасибо за обращение! Мы получили ваше сообщение и ответим в ближайшее время. Среднее время ответа: 15 минут.',
        timestamp: new Date().toISOString(),
        type: 'text'
      })
    }, 1000)

    setContactForm({ subject: '', message: '' })
    setShowContactForm(false)
    router.push('/chats')
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header title="Поддержка" showBack onBack={() => router.back()} showNavButtons={false} />

      <div className="px-4 py-4 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://t.me/teddyxsup"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border hover:border-accent-cyan transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#229ED9]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.87 7.97-3.43 3.8-1.58 4.59-1.85 5.1-1.86.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Telegram</span>
          </a>

          <button
            onClick={() => setShowContactForm(true)}
            className="flex flex-col items-center gap-2 p-4 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border hover:border-accent-cyan transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Написать</span>
          </button>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Частые вопросы</h2>
          <div className="space-y-2">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-light-text dark:text-dark-text pr-4">{item.question}</span>
                  <svg
                    className={`w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">Контакты</h3>
          <div className="space-y-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <p>Поддержка: @teddyxsup</p>
            <p>Время работы: 24/7</p>
            <p>Среднее время ответа: 15 минут</p>
          </div>
        </div>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-4 mt-4 pb-2">
          <a
            href="https://telegra.ph/Politika-konfidencialnosti-08-15-17"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            Политика конфиденциальности
          </a>
          <span className="text-light-text-secondary dark:text-dark-text-secondary">•</span>
          <a
            href="https://telegra.ph/Polzovatelskoe-soglashenie-08-15-10"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            Пользовательское соглашение
          </a>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-light-card dark:bg-dark-card w-full max-h-[80vh] rounded-t-3xl overflow-y-auto">
            <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Написать в поддержку</h2>
              <button onClick={() => setShowContactForm(false)} className="text-2xl text-light-text-secondary">×</button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Тема обращения</label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="Например: Проблема с заказом"
                  className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Сообщение</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Опишите вашу проблему или вопрос..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmitTicket}
                  disabled={!contactForm.subject.trim() || !contactForm.message.trim()}
                  className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
