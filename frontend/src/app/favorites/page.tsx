'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import { Product } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function FavoritesPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { favorites, user } = useAppStore()

  useEffect(() => {
    loadFavorites()
  }, [favorites])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      if (favorites.length === 0) {
        setProducts([])
        return
      }
      const data = await productsApi.getFavorites(user?.id || '', favorites)
      setProducts(data)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title="Избранное"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
          Избранные товары <span className="text-light-text-secondary dark:text-dark-text-secondary text-base">{products.length}</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
          </div>
        ) : (
          <>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <svg
                  className="w-20 h-20 text-light-text-secondary dark:text-dark-text-secondary mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-center">
                  Вы еще не добавили товары в избранное
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
