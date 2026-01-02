'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { Order } from '@/types'
import { ordersApi } from '@/lib/api'
import { getTelegramUser } from '@/lib/telegram'
import { format } from 'date-fns/format'
import { ru } from 'date-fns/locale/ru'

const statusConfig = {
  pending: {
    label: 'Ожидает оплаты',
    color: 'bg-yellow-500/20 text-yellow-500',
    icon: '⏳'
  },
  paid: {
    label: 'Оплачен',
    color: 'bg-blue-500/20 text-blue-500',
    icon: '💳'
  },
  processing: {
    label: 'В обработке',
    color: 'bg-purple-500/20 text-purple-500',
    icon: '⚙️'
  },
  delivered: {
    label: 'Доставлен',
    color: 'bg-green-500/20 text-green-500',
    icon: '✅'
  },
  cancelled: {
    label: 'Отменён',
    color: 'bg-red-500/20 text-red-500',
    icon: '❌'
  },
  refunded: {
    label: 'Возврат',
    color: 'bg-orange-500/20 text-orange-500',
    icon: '↩️'
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const user = getTelegramUser()
      const userId = user?.id?.toString() || 'dev_user'
      const data = await ordersApi.getByUserId(userId)
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title="Мои заказы"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-20 h-20 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 className="text-xl font-bold text-light-text dark:text-dark-text mb-2">
              Заказов пока нет
            </h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary text-center mb-6">
              Ваши заказы появятся здесь после оформления
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              Перейти к товарам
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending
              const isExpanded = expandedOrder === order._id

              return (
                <div
                  key={order._id}
                  className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden"
                >
                  {/* Order Header */}
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Заказ #{order._id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-light-text dark:text-dark-text">
                          {order.products.length} {order.products.length === 1 ? 'товар' : 'товара'}
                        </p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {format(new Date(order.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-accent-cyan">
                          {order.totalPrice.toLocaleString('ru-RU')} ₽
                        </p>
                        <svg
                          className={`w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-light-border dark:border-dark-border pt-3">
                      {/* Products List */}
                      <div className="space-y-3 mb-4">
                        {order.products.map((product, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            {product.productImage ? (
                              <img
                                src={product.productImage}
                                alt={product.productName || 'Product'}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-light-bg dark:bg-dark-bg flex items-center justify-center">
                                <svg className="w-6 h-6 text-light-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-light-text dark:text-dark-text truncate">
                                {product.productName || `Товар #${product.productId.slice(-6)}`}
                              </p>
                              {product.variantName && (
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                  {product.variantName}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-light-text dark:text-dark-text">
                                {product.price.toLocaleString('ru-RU')} ₽
                              </p>
                              {product.quantity > 1 && (
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  × {product.quantity}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Discount Info */}
                      {(order.discountAmount || order.promoCode) && (
                        <div className="flex items-center justify-between py-2 border-t border-light-border dark:border-dark-border">
                          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            Скидка {order.promoCode && `(${order.promoCode})`}
                          </span>
                          <span className="text-green-500 font-medium">
                            -{order.discountAmount?.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      )}

                      {/* Delivery Data */}
                      {order.status === 'delivered' && order.deliveryData && (
                        <div className="mt-3 p-3 bg-green-500/10 rounded-lg">
                          <p className="text-sm font-medium text-green-500 mb-1">Данные доставки:</p>
                          <p className="text-sm text-light-text dark:text-dark-text font-mono break-all">
                            {order.deliveryData}
                          </p>
                          {order.deliveryNote && (
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                              {order.deliveryNote}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Payment Info */}
                      {order.paymentMethod && (
                        <div className="flex items-center justify-between py-2 text-sm">
                          <span className="text-light-text-secondary dark:text-dark-text-secondary">
                            Способ оплаты:
                          </span>
                          <span className="text-light-text dark:text-dark-text">
                            {order.paymentMethod === 'cryptobot' ? 'CryptoBot' :
                             order.paymentMethod === 'cactuspay-sbp' ? 'СБП' : 'Карта'}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons - Task 6: Repeat Purchase */}
                      <div className="flex gap-2 mt-3">
                        {/* Buy Again - PRIMARY for delivered orders */}
                        {order.status === 'delivered' && order.products.length === 1 && (
                          <button
                            onClick={() => router.push(`/checkout?productId=${order.products[0].productId}`)}
                            className="flex-1 py-2.5 bg-accent-cyan text-white text-sm font-bold rounded-lg hover:bg-accent-cyan/90 transition-colors"
                          >
                            Купить снова
                          </button>
                        )}

                        {/* Support Button - secondary */}
                        <button
                          onClick={() => router.push('/support')}
                          className={`py-2 text-accent-cyan text-sm font-medium border border-accent-cyan/30 rounded-lg hover:bg-accent-cyan/10 transition-colors ${
                            order.status === 'delivered' && order.products.length === 1 ? 'flex-1' : 'w-full'
                          }`}
                        >
                          Поддержка
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
