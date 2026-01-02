'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'
import { getTelegramUser } from '@/lib/telegram'
import { sellerApplicationsApi } from '@/lib/api'

const content = {
  ru: {
    title: 'Стать продавцом',
    steps: [
      {
        num: 1,
        title: 'Заполните заявку',
        desc: 'Укажите информацию о себе и товарах'
      },
      {
        num: 2,
        title: 'Проверка',
        desc: 'Мы проверим вашу заявку в течение 24 часов'
      },
      {
        num: 3,
        title: 'Начните продавать',
        desc: 'Добавляйте товары и получайте доход'
      }
    ],
    form: {
      shopName: 'Название магазина',
      shopNamePlaceholder: 'Например: Digital Store',
      category: 'Категория товаров',
      categories: [
        'AI сервисы',
        'VPN / Proxy',
        'Стриминг',
        'Игры',
        'Софт',
        'Аккаунты',
        'Другое'
      ],
      description: 'Опишите ваши товары',
      descriptionPlaceholder: 'Что вы планируете продавать? Расскажите подробнее...',
      telegram: 'Telegram для связи',
      telegramPlaceholder: '@username',
      agreement: 'Я согласен с',
      rules: 'правилами для продавцов',
      submit: 'Подать заявку',
      submitting: 'Отправка...'
    },
    benefits: {
      title: 'Преимущества Yehor Shop',
      items: [
        { icon: '💰', text: 'Комиссия всего 5%' },
        { icon: '🛡️', text: 'Escrow защита' },
        { icon: '🚀', text: 'Автодоставка товаров' },
        { icon: '📊', text: 'Подробная статистика' }
      ]
    },
    success: {
      title: 'Заявка отправлена!',
      desc: 'Мы свяжемся с вами в течение 24 часов через Telegram.',
      button: 'Вернуться на главную'
    },
    errors: {
      shopName: 'Укажите название магазина',
      category: 'Выберите категорию',
      description: 'Опишите ваши товары',
      telegram: 'Укажите Telegram для связи',
      agreement: 'Необходимо согласие с правилами'
    }
  },
  en: {
    title: 'Become a Seller',
    steps: [
      {
        num: 1,
        title: 'Fill out application',
        desc: 'Provide info about yourself and products'
      },
      {
        num: 2,
        title: 'Verification',
        desc: 'We\'ll review your application within 24 hours'
      },
      {
        num: 3,
        title: 'Start selling',
        desc: 'Add products and earn money'
      }
    ],
    form: {
      shopName: 'Shop name',
      shopNamePlaceholder: 'E.g.: Digital Store',
      category: 'Product category',
      categories: [
        'AI services',
        'VPN / Proxy',
        'Streaming',
        'Games',
        'Software',
        'Accounts',
        'Other'
      ],
      description: 'Describe your products',
      descriptionPlaceholder: 'What do you plan to sell? Tell us more...',
      telegram: 'Telegram for contact',
      telegramPlaceholder: '@username',
      agreement: 'I agree to the',
      rules: 'seller rules',
      submit: 'Submit Application',
      submitting: 'Submitting...'
    },
    benefits: {
      title: 'Yehor Shop Benefits',
      items: [
        { icon: '💰', text: 'Only 5% commission' },
        { icon: '🛡️', text: 'Escrow protection' },
        { icon: '🚀', text: 'Auto-delivery' },
        { icon: '📊', text: 'Detailed analytics' }
      ]
    },
    success: {
      title: 'Application submitted!',
      desc: 'We\'ll contact you within 24 hours via Telegram.',
      button: 'Return to Home'
    },
    errors: {
      shopName: 'Enter shop name',
      category: 'Select a category',
      description: 'Describe your products',
      telegram: 'Enter Telegram for contact',
      agreement: 'Agreement with rules required'
    }
  }
}

export default function BecomeSellerPage() {
  const router = useRouter()
  const { language } = useAppStore()
  const t = content[language]

  const [formData, setFormData] = useState({
    shopName: '',
    category: '',
    description: '',
    telegram: '',
    agreed: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const telegramUser = getTelegramUser()

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.shopName.trim()) newErrors.shopName = t.errors.shopName
    if (!formData.category) newErrors.category = t.errors.category
    if (!formData.description.trim()) newErrors.description = t.errors.description
    if (!formData.telegram.trim()) newErrors.telegram = t.errors.telegram
    if (!formData.agreed) newErrors.agreed = t.errors.agreement

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      await sellerApplicationsApi.submit({
        shopName: formData.shopName,
        category: formData.category,
        description: formData.description,
        telegram: formData.telegram,
        userId: telegramUser?.id?.toString(),
        userName: telegramUser?.name || telegramUser?.username
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Error submitting application:', error)
      setErrors({ submit: language === 'ru' ? 'Ошибка отправки. Попробуйте снова.' : 'Submission failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
        <Header
          title={t.title}
          showBack
          onBack={() => router.push('/')}
        />

        <div className="px-4 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-3">
            {t.success.title}
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-8">
            {t.success.desc}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-accent-cyan text-white rounded-xl font-semibold"
          >
            {t.success.button}
          </button>
        </div>

        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title={t.title}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        {/* Steps */}
        <div className="flex justify-between mb-8">
          {t.steps.map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-accent-cyan text-white rounded-full flex items-center justify-center font-bold">
                {step.num}
              </div>
              <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shop Name */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              {t.form.shopName}
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              placeholder={t.form.shopNamePlaceholder}
              className={`w-full px-4 py-3 bg-light-card dark:bg-dark-card border rounded-xl text-light-text dark:text-dark-text placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan ${
                errors.shopName ? 'border-red-500' : 'border-light-border dark:border-dark-border'
              }`}
            />
            {errors.shopName && (
              <p className="text-red-500 text-xs mt-1">{errors.shopName}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              {t.form.category}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full px-4 py-3 bg-light-card dark:bg-dark-card border rounded-xl text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-cyan ${
                errors.category ? 'border-red-500' : 'border-light-border dark:border-dark-border'
              }`}
            >
              <option value="">--</option>
              {t.form.categories.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1">{errors.category}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              {t.form.description}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t.form.descriptionPlaceholder}
              rows={4}
              className={`w-full px-4 py-3 bg-light-card dark:bg-dark-card border rounded-xl text-light-text dark:text-dark-text placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan resize-none ${
                errors.description ? 'border-red-500' : 'border-light-border dark:border-dark-border'
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Telegram */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              {t.form.telegram}
            </label>
            <input
              type="text"
              value={formData.telegram}
              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              placeholder={t.form.telegramPlaceholder}
              className={`w-full px-4 py-3 bg-light-card dark:bg-dark-card border rounded-xl text-light-text dark:text-dark-text placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan ${
                errors.telegram ? 'border-red-500' : 'border-light-border dark:border-dark-border'
              }`}
            />
            {errors.telegram && (
              <p className="text-red-500 text-xs mt-1">{errors.telegram}</p>
            )}
          </div>

          {/* Agreement */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreement"
              checked={formData.agreed}
              onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded border-light-border dark:border-dark-border text-accent-cyan focus:ring-accent-cyan"
            />
            <label htmlFor="agreement" className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {t.form.agreement}{' '}
              <a href="/seller-rules" className="text-accent-cyan hover:underline">
                {t.form.rules}
              </a>
            </label>
          </div>
          {errors.agreed && (
            <p className="text-red-500 text-xs">{errors.agreed}</p>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-red-500 text-sm text-center">{errors.submit}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? t.form.submitting : t.form.submit}
          </button>
        </form>

        {/* Benefits */}
        <div className="mt-8 bg-light-card dark:bg-dark-card rounded-xl p-5 border border-light-border dark:border-dark-border">
          <h3 className="font-bold text-light-text dark:text-dark-text mb-4">
            {t.benefits.title}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {t.benefits.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
