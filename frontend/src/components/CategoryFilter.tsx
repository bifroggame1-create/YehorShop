'use client'

import { useAppStore } from '@/lib/store'
import { t } from '@/lib/i18n'

const categories = [
  { id: 'all', nameKey: 'all' as const },
  { id: 'ai-subscriptions', nameKey: 'ai' as const },
  { id: 'vpn', nameKey: 'vpn' as const },
  { id: 'streaming', nameKey: 'streaming' as const },
  { id: 'gaming', nameKey: 'gaming' as const },
  { id: 'software', nameKey: 'software' as const },
  { id: 'education', nameKey: 'other' as const },
]

export default function CategoryFilter() {
  const { selectedCategory, setSelectedCategory, language } = useAppStore()

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
      <button className="flex items-center gap-2 px-4 py-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full whitespace-nowrap hover:bg-light-border dark:hover:bg-dark-border transition-colors">
        <svg className="w-4 h-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-accent-cyan text-black dark:text-white'
              : 'bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`}
        >
          {t(category.nameKey, language)}
        </button>
      ))}
    </div>
  )
}
