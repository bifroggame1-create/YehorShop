'use client'

import { Product } from '@/types'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/currency'
import { t } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import { hapticImpact, hapticNotification } from '@/lib/telegram'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const router = useRouter()
  const { toggleFavorite, isFavorite, language, currency, addToCart } = useAppStore()
  const toast = useToast()
  const favorite = isFavorite(product._id)

  const hasAutoDelivery = (product as any).deliveryType === 'auto'
  const salesCount = (product as any).salesCount || 0
  const sellerRating = product.seller.rating
  const displayRating = sellerRating > 5 ? sellerRating : Math.round(sellerRating * 20)

  // Calculate savings percentage
  const savingsPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticNotification('success')
    addToCart({
      productId: product._id,
      productName: product.name,
      productImage: product.images[0] || '/placeholder.jpg',
      price: product.price,
      quantity: 1
    })
    toast.show(language === 'ru' ? 'Добавлено в корзину' : 'Added to cart', 'success')
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticImpact('light')
    toggleFavorite(product._id)
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/product/${product._id}`)
    }
  }

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/checkout?productId=${product._id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-light-card dark:bg-dark-card rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity border border-light-border dark:border-dark-border"
    >
      {/* Image Section - balanced size */}
      <div className="relative aspect-square max-h-44">
        <img
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Favorite - smaller, less prominent */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 w-7 h-7 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <svg
            className={`w-4 h-4 ${favorite ? 'fill-pink-500 text-pink-500' : 'fill-none text-white/80'}`}
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

        {/* Primary badges - Delivery & Protection */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Delivery speed - PRIMARY */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
            hasAutoDelivery
              ? 'bg-accent-cyan text-white'
              : 'bg-white/90 dark:bg-dark-card/90 text-light-text dark:text-dark-text'
          }`}>
            {hasAutoDelivery ? '⚡' : '⏳'}
            <span>{hasAutoDelivery
              ? (language === 'ru' ? 'Мгновенно' : 'Instant')
              : (language === 'ru' ? 'до 30 мин' : '~30 min')
            }</span>
          </div>

          {/* Protection badge */}
          {product.condition === 'new' && (
            <div className="flex items-center gap-1 bg-white/90 dark:bg-dark-card/90 px-2 py-0.5 rounded text-[10px] text-light-text dark:text-dark-text">
              🛡 {language === 'ru' ? 'Защита' : 'Protected'}
            </div>
          )}
        </div>

        {/* Social proof - bottom */}
        {salesCount > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white/90">
            {salesCount}+ {language === 'ru' ? 'продано' : 'sold'}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3">
        {/* Product name - secondary */}
        <h3 className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 leading-tight mb-2">
          {product.name}
        </h3>

        {/* PRICE - PRIMARY, LARGEST */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-light-text dark:text-dark-text">
              {formatPrice(product.price, currency)}
            </p>
            {product.oldPrice && product.oldPrice > product.price && (
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-through">
                {formatPrice(product.oldPrice, currency)}
              </p>
            )}
          </div>
          {/* Savings anchor - Task 2 */}
          {savingsPercent > 0 && (
            <p className="text-[10px] text-green-500 mt-0.5">
              {language === 'ru'
                ? `Экономия ${savingsPercent}%`
                : `Save ${savingsPercent}%`
              }
            </p>
          )}
        </div>

        {/* Seller info - SECONDARY, reduced */}
        <div className="flex items-center gap-1.5 mb-3 opacity-70">
          <img
            src={product.seller.avatar || '/default-avatar.png'}
            alt={product.seller.name}
            className="w-4 h-4 rounded-full"
          />
          <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary truncate flex-1">
            {product.seller.name}
          </span>
          {/* Seller success % */}
          <div className={`flex items-center gap-0.5 text-[10px] ${
            displayRating >= 90 ? 'text-green-500' : displayRating >= 70 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            <span>⭐</span>
            <span>{displayRating}%</span>
          </div>
        </div>

        {/* CTA Section - Task 3: Dominant Buy button */}
        <div className="flex gap-2">
          {/* Cart - SECONDARY, smaller */}
          <button
            onClick={handleAddToCart}
            className="w-8 h-9 flex items-center justify-center bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <svg className="w-4 h-4 text-light-text dark:text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Buy - PRIMARY, dominant */}
          <button
            onClick={handleBuyClick}
            className="flex-1 bg-accent-cyan hover:bg-accent-cyan/90 text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm shadow-accent-cyan/20"
          >
            {t('buy', language)}
          </button>
        </div>

        {/* Purchase flow hint - Task 1 */}
        <p className="text-[9px] text-light-text-secondary dark:text-dark-text-secondary text-center mt-2 opacity-60">
          {language === 'ru'
            ? 'Оплата → доставка в чат'
            : 'Pay → delivery to chat'
          }
        </p>
      </div>
    </div>
  )
}
