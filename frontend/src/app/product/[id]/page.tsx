'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import { EscrowExplainer } from '@/components/TrustBanner'
import { ProductDetailSkeleton } from '@/components/Skeleton'
import { Product, ProductVariant, Review } from '@/types'
import { productsApi, chatApi, reviewsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { getTelegramUser, hapticNotification, hapticImpact } from '@/lib/telegram'
import { useToast } from '@/components/Toast'
import { formatPrice } from '@/lib/currency'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStats, setReviewStats] = useState<{ count: number; average: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const { toggleFavorite, isFavorite, addToCart, language, currency } = useAppStore()

  useEffect(() => {
    loadProduct()
  }, [params.id])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productsApi.getById(params.id as string)
      setProduct(data)

      // Select first variant by default if available
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0])
      }

      // Load recommended products
      const allProducts = await productsApi.getAll({ category: data.category })
      const recommended = allProducts.filter(p => p._id !== data._id).slice(0, 5)
      setRecommendedProducts(recommended)

      // Load reviews
      try {
        const [reviewsData, statsData] = await Promise.all([
          reviewsApi.getByProduct(params.id as string),
          reviewsApi.getStats(params.id as string)
        ])
        setReviews(reviewsData.slice(0, 3))
        setReviewStats(statsData)
      } catch {
        // Reviews might not exist
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactSeller = async () => {
    if (!product) return

    try {
      const user = getTelegramUser()
      const buyerId = user?.id || 'anonymous'

      if (buyerId === 'anonymous') {
        console.warn('No Telegram user found for chat creation')
      }

      const productId = product._id || (params.id as string)
      if (!productId) {
        toast.show(language === 'ru' ? 'Не удалось создать чат' : 'Failed to create chat', 'error')
        return
      }

      const response = await chatApi.createChat({
        buyerId,
        sellerId: product.seller.id,
        productId,
        productName: product.name
      })

      if (response.success && response.chat) {
        router.push(`/chats/${response.chat.id}`)
      } else {
        toast.show(language === 'ru' ? 'Не удалось создать чат' : 'Failed to create chat', 'error')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      toast.show(language === 'ru' ? 'Ошибка при создании чата' : 'Error creating chat', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
        <Header showBack onBack={() => router.back()} />
        <ProductDetailSkeleton />
        <BottomNav />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          {language === 'ru' ? 'Товар не найден' : 'Product not found'}
        </p>
      </div>
    )
  }

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const currentPrice = selectedVariant?.price || product.price
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
      <Header
        title={product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        showBack
        onBack={() => router.back()}
      />

      {/* Image Gallery */}
      <div className="relative aspect-square bg-light-card dark:bg-dark-card">
        <img
          src={product.images[currentImageIndex] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Badges on image */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {hasAutoDelivery && (
            <div className="flex items-center gap-1.5 bg-yellow-500 px-2.5 py-1 rounded-full text-xs text-black font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{language === 'ru' ? 'Мгновенная доставка' : 'Instant delivery'}</span>
            </div>
          )}
          {product.condition === 'new' && (
            <div className="bg-green-500 px-2.5 py-1 rounded-full text-xs text-white font-semibold">
              {language === 'ru' ? 'Гарантия' : 'Warranty'}
            </div>
          )}
        </div>

        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {product.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* Price and Title with Review Summary */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              {formatPrice(currentPrice, currency)}
            </h1>
            {product.oldPrice && product.oldPrice > currentPrice && (
              <span className="text-base text-light-text-secondary dark:text-dark-text-secondary line-through">
                {formatPrice(product.oldPrice, currency)}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold mb-2 text-light-text dark:text-dark-text">{product.name}</h2>

          {/* Review Summary - surfaced at top */}
          {reviewStats && reviewStats.count > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="font-semibold text-light-text dark:text-dark-text">
                  {reviewStats.average.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {reviewStats.count} {language === 'ru' ? 'отзывов' : 'reviews'}
              </span>
            </div>
          )}
        </div>

        {/* What you get section */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">
            {language === 'ru' ? 'Что вы получите' : 'What you get'}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'ru' ? 'Ключ активации / Аккаунт' : 'Activation key / Account'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'ru' ? 'Инструкция по активации' : 'Activation instructions'}</span>
            </div>
            {hasAutoDelivery && (
              <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{language === 'ru' ? 'Доставка: мгновенно после оплаты' : 'Delivery: instant after payment'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Variants Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <h3 className="text-sm font-semibold mb-3 text-light-text-secondary dark:text-dark-text-secondary">
              {language === 'ru' ? 'Выберите вариант' : 'Select variant'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    selectedVariant?.id === variant.id
                      ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                      : 'border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-accent-cyan/50'
                  }`}
                >
                  {variant.name} — {formatPrice(variant.price, currency)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buyer Protection - Trust Section */}
        <div className="mb-4">
          <EscrowExplainer variant="full" />
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <h3 className="font-semibold mb-3 text-light-text dark:text-dark-text">
              {language === 'ru' ? 'Описание' : 'Description'}
            </h3>
            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-line leading-relaxed">
              {product.description}
            </div>
          </div>
        )}

        {/* Seller Card */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={product.seller.avatar || '/default-avatar.png'}
              alt={product.seller.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-light-text dark:text-dark-text">{product.seller.name}</span>
                <svg className="w-4 h-4 text-accent-cyan" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                displayRating >= 90
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : displayRating >= 70
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span>{displayRating}% {language === 'ru' ? 'успешных' : 'successful'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/seller/${product.seller.id}`)}
              className="flex-1 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text py-2 rounded-lg text-sm font-medium"
            >
              {language === 'ru' ? 'Профиль' : 'Profile'}
            </button>
            <button
              onClick={handleContactSeller}
              className="flex-1 bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan py-2 rounded-lg text-sm font-medium"
            >
              {language === 'ru' ? 'Написать' : 'Message'}
            </button>
          </div>
        </div>

        {/* Reviews Preview */}
        {reviews.length > 0 && (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-light-text dark:text-dark-text">
                {language === 'ru' ? 'Отзывы' : 'Reviews'}
              </h3>
              {reviewStats && reviewStats.count > 3 && (
                <span className="text-sm text-accent-cyan">
                  {language === 'ru' ? 'Все' : 'All'} ({reviewStats.count})
                </span>
              )}
            </div>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="pb-3 border-b border-light-border dark:border-dark-border last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-light-text dark:text-dark-text">{review.userName}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
              {language === 'ru' ? 'Похожие товары' : 'Similar products'}
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {recommendedProducts.map((recProduct) => (
                <div key={recProduct._id} className="flex-shrink-0 w-48">
                  <ProductCard product={recProduct} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-t border-light-border dark:border-dark-border safe-area-bottom">
        <div className="flex gap-3 items-center">
          {/* Cart button */}
          <button
            onClick={() => {
              hapticNotification('success')
              addToCart({
                productId: product._id,
                productName: product.name,
                productImage: product.images[0] || '/placeholder.jpg',
                price: currentPrice,
                quantity: 1,
                variantId: selectedVariant?.id,
                variantName: selectedVariant?.name
              })
              toast.show(language === 'ru' ? 'Добавлено в корзину' : 'Added to cart', 'success')
            }}
            className="w-12 h-12 flex items-center justify-center bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl"
          >
            <svg className="w-6 h-6 text-light-text dark:text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Buy button with price */}
          <button
            onClick={() => {
              const params = new URLSearchParams({
                productId: product._id,
                ...(selectedVariant && { variantId: selectedVariant.id })
              })
              router.push(`/checkout?${params.toString()}`)
            }}
            className="flex-1 bg-accent-cyan text-white py-3.5 rounded-xl font-semibold hover:bg-accent-cyan/90 transition-colors flex items-center justify-center gap-2"
          >
            <span>{language === 'ru' ? 'Купить за' : 'Buy for'}</span>
            <span className="font-bold">{formatPrice(currentPrice, currency)}</span>
          </button>

          {/* Favorite button */}
          <button
            onClick={() => {
              hapticImpact('light')
              toggleFavorite(product._id)
            }}
            className="w-12 h-12 flex items-center justify-center bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl"
          >
            <svg
              className={`w-6 h-6 ${isFavorite(product._id) ? 'fill-pink-500 text-pink-500' : 'fill-none text-light-text dark:text-dark-text'}`}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
