'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function ContactsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      <Header
        title="Контакты"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none text-light-text dark:text-dark-text">

          {/* Main Contact Card */}
          <div className="bg-gradient-to-r from-accent-cyan to-accent-blue rounded-2xl p-6 mb-6 text-white">
            <h2 className="text-xl font-bold mb-2 text-white">Служба поддержки</h2>
            <p className="text-white/90 text-sm mb-4">
              Мы готовы помочь вам с любыми вопросами о заказах, доставке и работе платформы.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://t.me/teddyxsup"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-3 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <div>
                  <div className="font-medium">Telegram</div>
                  <div className="text-sm text-white/80">@teddyxsup</div>
                </div>
              </a>
            </div>
          </div>

          {/* Contact Methods */}
          <h2 className="text-lg font-bold mt-6 mb-3">Способы связи</h2>

          <div className="space-y-3 mb-6">
            <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-cyan" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-light-text dark:text-dark-text">Telegram (рекомендуется)</div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">@teddyxsup</div>
                </div>
                <div className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Быстрый ответ</div>
              </div>
            </div>

            <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-light-text dark:text-dark-text">Email</div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">support@yehorshop.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <h2 className="text-lg font-bold mt-6 mb-3">Время работы</h2>
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-6">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-light-text dark:text-dark-text">График работы поддержки</span>
            </div>
            <ul className="text-sm space-y-2 text-light-text-secondary dark:text-dark-text-secondary">
              <li className="flex justify-between">
                <span>Понедельник – Пятница</span>
                <span className="font-medium text-light-text dark:text-dark-text">10:00 – 22:00 (МСК)</span>
              </li>
              <li className="flex justify-between">
                <span>Суббота – Воскресенье</span>
                <span className="font-medium text-light-text dark:text-dark-text">11:00 – 20:00 (МСК)</span>
              </li>
            </ul>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-3">
              Автоматическая доставка товаров работает круглосуточно
            </p>
          </div>

          {/* Response Times */}
          <h2 className="text-lg font-bold mt-6 mb-3">Сроки ответа</h2>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-light-border dark:border-dark-border">
              <span className="text-sm text-light-text dark:text-dark-text">Telegram</span>
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">до 1 часа в рабочее время</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-light-border dark:border-dark-border">
              <span className="text-sm text-light-text dark:text-dark-text">Email</span>
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">до 24 часов</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-light-text dark:text-dark-text">Споры (disputes)</span>
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">до 72 часов</span>
            </div>
          </div>

          {/* What We Help With */}
          <h2 className="text-lg font-bold mt-6 mb-3">Чем можем помочь</h2>
          <ul className="list-disc pl-6 mb-6 text-sm space-y-1 text-light-text dark:text-dark-text">
            <li>Вопросы по заказам и доставке</li>
            <li>Проблемы с оплатой</li>
            <li>Рассмотрение споров</li>
            <li>Возврат средств</li>
            <li>Технические вопросы</li>
            <li>Сотрудничество с продавцами</li>
            <li>Запросы по персональным данным</li>
          </ul>

          {/* Legal Info */}
          <h2 className="text-lg font-bold mt-6 mb-3">Правовая информация</h2>
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-6">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
              Платформа Yehor Shop является посредником между продавцами и покупателями цифровых товаров. Платформа обеспечивает техническую возможность совершения сделок и защиту покупателей через механизм эскроу.
            </p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Отношения между пользователями и Платформой регулируются Публичной офертой и применимым законодательством.
            </p>
          </div>

          {/* Quick Links */}
          <h2 className="text-lg font-bold mt-6 mb-3">Полезные ссылки</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <a href="/legal/offer" className="bg-light-card dark:bg-dark-card rounded-xl p-3 border border-light-border dark:border-dark-border text-center text-sm hover:border-accent-cyan transition-colors">
              Публичная оферта
            </a>
            <a href="/legal/privacy" className="bg-light-card dark:bg-dark-card rounded-xl p-3 border border-light-border dark:border-dark-border text-center text-sm hover:border-accent-cyan transition-colors">
              Конфиденциальность
            </a>
            <a href="/legal/refund" className="bg-light-card dark:bg-dark-card rounded-xl p-3 border border-light-border dark:border-dark-border text-center text-sm hover:border-accent-cyan transition-colors">
              Возврат и отмена
            </a>
            <a href="/legal/delivery" className="bg-light-card dark:bg-dark-card rounded-xl p-3 border border-light-border dark:border-dark-border text-center text-sm hover:border-accent-cyan transition-colors">
              Условия доставки
            </a>
          </div>

          <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Обращаясь в службу поддержки, пожалуйста, указывайте номер заказа или ID пользователя для более быстрого решения вопроса.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
