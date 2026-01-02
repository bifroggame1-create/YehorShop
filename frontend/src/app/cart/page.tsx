'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'
import Link from 'next/link'

export default function CartPage() {
  const router = useRouter()
  const { cart, cartTotal, removeFromCart, updateCartQuantity, clearCart } = useAppStore()

  const handleCheckout = () => {
    if (cart.length === 0) return
    // Navigate to checkout with cart mode
    router.push('/checkout?fromCart=true')
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title="Корзина"
        showBack
        onBack={() => router.back()}
        showCart={false}
      />

      <div className="px-4 py-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-20 h-20 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text mb-2">
              Корзина пуста
            </h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary text-center mb-6">
              Добавьте товары, чтобы оформить заказ
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              Перейти к товарам
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {cart.map((item, index) => (
                <div
                  key={`${item.productId}-${item.variantId || index}`}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-light-text dark:text-dark-text truncate">
                        {item.productName}
                      </h3>
                      {item.variantName && (
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-lg font-bold text-accent-cyan mt-1">
                        {item.price.toLocaleString()}₽
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Количество
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1, item.variantId)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold text-light-text dark:text-dark-text">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1, item.variantId)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Cart Button */}
            <button
              onClick={clearCart}
              className="w-full py-2 text-red-500 text-sm font-medium mb-6"
            >
              Очистить корзину
            </button>

            {/* Order Summary */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-4">
              <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">
                Итого
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">
                    Товары ({cart.reduce((sum, i) => sum + i.quantity, 0)} шт.)
                  </span>
                  <span className="text-light-text dark:text-dark-text">
                    {cartTotal.toLocaleString()}₽
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-light-border dark:border-dark-border">
                  <span className="font-semibold text-light-text dark:text-dark-text">
                    К оплате
                  </span>
                  <span className="text-xl font-bold text-accent-cyan">
                    {cartTotal.toLocaleString()}₽
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-accent-cyan text-white rounded-xl font-semibold text-lg transition-all active:scale-[0.98]"
            >
              Оформить заказ
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
