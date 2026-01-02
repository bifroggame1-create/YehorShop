'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import { SellerBadges, SellerRating } from '@/components/SellerBadge'
import { Product, SellerProfile } from '@/types'
import { productsApi, chatApi, marketplaceApi } from '@/lib/api'
import { getTelegramUser } from '@/lib/telegram'
import { useAppStore } from '@/lib/store'
import { format } from 'date-fns/format'
import { ru, enUS } from 'date-fns/locale'

export default function SellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { language } = useAppStore()
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSellerData()
  }, [params.id])

  const loadSellerData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load seller's products first
      const productsData = await productsApi.getAll()
      const sellerProducts = productsData.filter(p => p.seller.id === params.id)
      setProducts(sellerProducts)

      // Try to load seller profile from marketplace API
      try {
        const sellerData = await marketplaceApi.getSellerProfile(params.id as string)
        setSeller(sellerData)
      } catch {
        // Fallback: construct seller profile from product data
        if (sellerProducts.length > 0) {
          const firstProduct = sellerProducts[0]
          setSeller({
            id: firstProduct.seller.id,
            name: firstProduct.seller.name,
            avatar: firstProduct.seller.avatar || '/default-avatar.png',
            rating: firstProduct.seller.rating || 5.0,
            ratingCount: sellerProducts.length * 2,
            memberSince: firstProduct.createdAt || new Date().toISOString(),
            isVerified: true,
            badges: ['trusted', 'verified'],
            stats: {
              totalOrders: sellerProducts.length * 10,
              successfulOrders: sellerProducts.length * 10,
            }
          })
        } else {
          throw new Error('Seller not found')
        }
      }
    } catch (err: any) {
      console.error('Error loading seller data:', err)
      setError(err.response?.data?.error || (language === 'ru' ? 'Продавец не найден' : 'Seller not found'))
    } finally {
      setLoading(false)
    }
  }

  const handleWriteMessage = async () => {
    if (!seller) return

    const telegramUser = getTelegramUser()
    const buyerId = telegramUser?.id || 'anonymous'

    if (buyerId === 'anonymous') {
      console.warn('No Telegram user found for chat creation')
    }

    try {
      const response = await chatApi.createChat({
        buyerId: buyerId,
        sellerId: seller.id,
        productId: products[0]?._id || 'general',
        productName: products[0]?.name || (language === 'ru' ? 'Общий вопрос' : 'General inquiry')
      })

      if (response.success && response.chat) {
        router.push(`/chats/${response.chat.id}`)
      } else {
        router.push('/chats')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      router.push('/chats')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
        <Header
          title={language === 'ru' ? 'Профиль продавца' : 'Seller Profile'}
          showBack
          onBack={() => router.back()}
        />
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <svg className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-center">
            {error || (language === 'ru' ? 'Продавец не найден' : 'Seller not found')}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-accent-cyan text-white rounded-lg font-medium"
          >
            {language === 'ru' ? 'На главную' : 'Go Home'}
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Calculate success rate
  const successRate = seller.stats.totalOrders > 0
    ? Math.round((seller.stats.successfulOrders / seller.stats.totalOrders) * 100)
    : 100

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title={language === 'ru' ? 'Профиль продавца' : 'Seller Profile'}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        {/* Seller Info Card */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-5 border border-light-border dark:border-dark-border mb-4">
          <div className="flex items-start gap-4">
            <img
              src={seller.avatar || '/default-avatar.png'}
              alt={seller.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent-cyan"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-light-text dark:text-dark-text truncate">
                  {seller.name}
                </h2>
                {seller.isVerified && (
                  <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Member since */}
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                {language === 'ru' ? 'На Yehor Shop с ' : 'On Yehor Shop since '}
                {format(new Date(seller.memberSince), 'd MMMM yyyy', { locale: language === 'ru' ? ru : enUS })}
              </p>

              {/* Badges */}
              {seller.badges.length > 0 && (
                <div className="mt-2">
                  <SellerBadges badges={seller.badges} size="sm" showLabels />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Rating Card */}
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
            <div className="flex flex-col items-center text-center">
              <SellerRating rating={seller.rating} size="lg" />
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                {seller.ratingCount} {language === 'ru' ? 'оценок' : 'ratings'}
              </p>
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-2xl font-bold text-light-text dark:text-dark-text">
                {successRate}%
              </span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {language === 'ru' ? 'успешных сделок' : 'successful deals'}
            </p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-2xl font-bold text-light-text dark:text-dark-text">
                {products.length}
              </span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {language === 'ru' ? 'товаров' : 'products'}
            </p>
          </div>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="text-2xl font-bold text-light-text dark:text-dark-text">
                {seller.stats.totalOrders}
              </span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {language === 'ru' ? 'всего продаж' : 'total sales'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleWriteMessage}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-cyan text-white rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {language === 'ru' ? 'Написать сообщение' : 'Send Message'}
          </button>
          <button
            className="p-3 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Seller's Products */}
        <div>
          <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-4">
            {language === 'ru' ? 'Товары продавца' : "Seller's Products"}
          </h3>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-light-card dark:bg-dark-card rounded-xl p-8 border border-light-border dark:border-dark-border text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {language === 'ru' ? 'У этого продавца пока нет товаров' : 'This seller has no products yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
