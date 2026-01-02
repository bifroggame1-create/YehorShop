'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import CategoryFilter from '@/components/CategoryFilter'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import ThemeToggle from '@/components/ThemeToggle'
import PopularServices from '@/components/PopularServices'
import TrustBanner from '@/components/TrustBanner'
import FirstTimeOnboarding from '@/components/FirstTimeOnboarding'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { Product, SortType } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { t } from '@/lib/i18n'

const sortOptions: { value: SortType; label: { ru: string; en: string } }[] = [
  { value: 'popular', label: { ru: 'Популярные', en: 'Popular' } },
  { value: 'newest', label: { ru: 'Новые', en: 'Newest' } },
  { value: 'price_asc', label: { ru: 'Дешевле', en: 'Price: Low' } },
  { value: 'price_desc', label: { ru: 'Дороже', en: 'Price: High' } },
  { value: 'rating', label: { ru: 'По рейтингу', en: 'Top Rated' } }
]

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const { selectedCategory, searchQuery, language } = useAppStore()

  useEffect(() => {
    loadProducts()
  }, [selectedCategory, searchQuery, sortBy])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const params: any = { sort: sortBy }
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (searchQuery) params.search = searchQuery

      const data = await productsApi.getAll(params)
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label[language] || sortOptions[0].label[language]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        rightAction={<ThemeToggle />}
      />

      {/* Trust Banner - first impression */}
      <TrustBanner />

      <SearchBar />
      <CategoryFilter />
      <PopularServices />

      <div id="products-section" className="px-4 py-4">
        {/* Section header with sorting */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {t('forYou', language)} <span className="text-light-text-secondary dark:text-dark-text-secondary text-base font-normal">{products.length}</span>
          </h2>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-sm text-light-text dark:text-dark-text"
            >
              <svg className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>{currentSortLabel}</span>
              <svg className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value)
                        setShowSortMenu(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? 'bg-accent-cyan/10 text-accent-cyan font-medium'
                          : 'text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                      }`}
                    >
                      {option.label[language]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-light-text-secondary dark:text-dark-text-secondary">{t('noProducts', language)}</p>
          </div>
        )}
      </div>

      {/* First time onboarding */}
      <FirstTimeOnboarding />

      <BottomNav />
    </div>
  )
}
