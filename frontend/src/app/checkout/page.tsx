'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { Product, ProductVariant } from '@/types'
import { productsApi, promoApi, paymentApi } from '@/lib/api'
import { useAppStore, CartItem } from '@/lib/store'
import { formatPrice } from '@/lib/currency'
import { formatCryptoAmount } from '@/lib/cryptoConverter'
import { t } from '@/lib/i18n'
import { EscrowExplainer } from '@/components/TrustBanner'

interface CheckoutItem {
  productId: string
  productName: string
  productImage: string
  variantId?: string
  variantName?: string
  price: number
  quantity: number
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, language, currency, cart, clearCart } = useAppStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([])
  const [isCartCheckout, setIsCartCheckout] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cryptobot' | 'xrocket' | 'telegram-stars' | 'cactuspay-sbp' | 'cactuspay-card'>('cryptobot')
  const [selectedCrypto, setSelectedCrypto] = useState<'TON' | 'USDT'>('TON')
  const [showPromo, setShowPromo] = useState(false)

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      const fromCart = searchParams.get('fromCart') === 'true'
      const productId = searchParams.get('productId')
      const variantId = searchParams.get('variantId')

      if (fromCart) {
        // Cart checkout mode
        if (cart.length === 0) {
          router.push('/cart')
          return
        }
        setIsCartCheckout(true)
        setCheckoutItems(cart)
      } else if (productId) {
        // Single product checkout mode
        const productData = await productsApi.getById(productId)
        setProduct(productData)

        let variant: ProductVariant | null = null
        if (variantId && productData.variants) {
          variant = productData.variants.find(v => v.id === variantId) || null
        } else if (productData.variants && productData.variants.length > 0) {
          variant = productData.variants[0]
        }

        if (variant) {
          setSelectedVariant(variant)
        }

        // Create checkout item from product
        setCheckoutItems([{
          productId: productData._id,
          productName: productData.name,
          productImage: productData.images[0] || '/placeholder.jpg',
          variantId: variant?.id,
          variantName: variant?.name,
          price: variant?.price || productData.price,
          quantity: 1
        }])
      } else {
        router.push('/')
        return
      }
    } catch (error) {
      console.error('Error loading checkout data:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  // Calculate base total from all items
  const itemsTotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = checkoutItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Введите промокод')
      return
    }

    try {
      const result = await promoApi.validate(promoCode, itemsTotal)

      if (result.valid) {
        setDiscount(result.discount)
        setPromoError('')
      } else {
        setPromoError(result.message || 'Промокод недействителен')
        setDiscount(0)
      }
    } catch (error) {
      setPromoError('Ошибка проверки промокода')
      setDiscount(0)
    }
  }

  const handleCheckout = async () => {
    if (checkoutItems.length === 0) return

    // Generate description based on items
    const getDescription = () => {
      if (checkoutItems.length === 1) {
        const item = checkoutItems[0]
        return item.variantName
          ? `Оплата: ${item.productName} - ${item.variantName}`
          : `Оплата: ${item.productName}`
      }
      return `Оплата заказа (${totalQuantity} товаров)`
    }

    const openPaymentUrl = (url: string) => {
      if (window.Telegram?.WebApp && (window.Telegram.WebApp as any).openLink) {
        (window.Telegram.WebApp as any).openLink(url)
      } else {
        window.open(url, '_blank')
      }
      // SECURITY FIX: Don't clear cart here - cart is now cleared via callback after payment confirmation
      // The backend sends confirmation to Telegram bot which handles cart state
      // Users can return and retry payment if it fails
    }

    // Для CryptoBot используем крипту
    if (paymentMethod === 'cryptobot') {
      try {
        setProcessing(true)

        const invoiceParams = {
          amount: finalPrice,
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          asset: selectedCrypto,
          // Pass all items for multi-item orders
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        const response = await paymentApi.createInvoice(invoiceParams)

        if (response.success && response.invoice) {
          openPaymentUrl(response.invoice.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          const details = response.details ? `\n\nДетали: ${JSON.stringify(response.details)}` : ''
          alert('Ошибка создания платежа:\n' + errorMsg + details)
        }
      } catch (error: any) {
        console.error('Checkout error:', error)
        // Task 7: Improved payment error copy
        const errorTitle = language === 'ru' ? 'Оплата не прошла' : 'Payment failed'
        const errorHelp = language === 'ru'
          ? '\n\nЧаще всего помогает:\n— другая карта\n— крипта\n— повтор через 1 минуту'
          : '\n\nUsually helps:\n— different card\n— crypto\n— retry in 1 minute'

        alert(errorTitle + errorHelp)
      } finally {
        setProcessing(false)
      }
    } else if (paymentMethod === 'xrocket') {
      // XRocket payment
      try {
        setProcessing(true)

        const invoiceParams = {
          amount: finalPrice,
          currency: selectedCrypto === 'TON' ? 'TONCOIN' : 'USDT',
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        const response = await paymentApi.createXRocketInvoice(invoiceParams)

        if (response.success && response.invoice) {
          openPaymentUrl(response.invoice.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          alert('Ошибка создания платежа:\n' + errorMsg)
        }
      } catch (error: any) {
        console.error('XRocket checkout error:', error)
        const errorTitle = language === 'ru' ? 'Оплата не прошла' : 'Payment failed'
        const errorHelp = language === 'ru'
          ? '\n\nЧаще всего помогает:\n— другая криптовалюта\n— повтор через 1 минуту'
          : '\n\nUsually helps:\n— different crypto\n— retry in 1 minute'

        alert(errorTitle + errorHelp)
      } finally {
        setProcessing(false)
      }
    } else if (paymentMethod === 'telegram-stars') {
      // Telegram Stars payment
      try {
        setProcessing(true)

        const invoiceParams = {
          amount: finalPrice,
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        const response = await paymentApi.createStarsInvoice(invoiceParams)

        if (response.success && response.invoice) {
          openPaymentUrl(response.invoice.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          alert('Ошибка создания платежа:\n' + errorMsg)
        }
      } catch (error: any) {
        console.error('Telegram Stars checkout error:', error)
        const errorTitle = language === 'ru' ? 'Оплата не прошла' : 'Payment failed'
        const errorHelp = language === 'ru'
          ? '\n\nПопробуйте другой способ оплаты'
          : '\n\nTry a different payment method'

        alert(errorTitle + errorHelp)
      } finally {
        setProcessing(false)
      }
    } else if (paymentMethod === 'cactuspay-sbp' || paymentMethod === 'cactuspay-card') {
      // CactusPay payment (SBP or Card)
      try {
        setProcessing(true)

        const cactusMethod = paymentMethod === 'cactuspay-sbp' ? 'sbp' : 'card'

        const paymentParams = {
          amount: finalPrice,
          description: getDescription(),
          productId: checkoutItems[0].productId,
          variantId: checkoutItems[0].variantId,
          method: cactusMethod as 'sbp' | 'card',
          items: checkoutItems.length > 1 ? checkoutItems : undefined,
        }

        const response = await paymentApi.createCactusPayment(paymentParams)

        if (response.success && response.payment) {
          openPaymentUrl(response.payment.payUrl)
        } else {
          const errorMsg = response.error || 'Неизвестная ошибка'
          alert('Ошибка создания платежа:\n' + errorMsg)
        }
      } catch (error: any) {
        console.error('CactusPay checkout error:', error)
        // Task 7: Improved payment error copy
        const errorTitle = language === 'ru' ? 'Оплата не прошла' : 'Payment failed'
        const errorHelp = language === 'ru'
          ? '\n\nЧаще всего помогает:\n— другая карта\n— СБП\n— повтор через 1 минуту'
          : '\n\nUsually helps:\n— different card\n— SBP\n— retry in 1 minute'

        alert(errorTitle + errorHelp)
      } finally {
        setProcessing(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (checkoutItems.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">Товары не найдены</p>
      </div>
    )
  }

  const discountedPrice = itemsTotal - discount

  // Add markup for crypto payments (CryptoBot 5%, XRocket 2%, no markup for CactusPay)
  const cryptoBotMarkup = paymentMethod === 'cryptobot' ? discountedPrice * 0.05 : 0
  const xRocketMarkup = paymentMethod === 'xrocket' ? discountedPrice * 0.02 : 0
  const finalPrice = discountedPrice + cryptoBotMarkup + xRocketMarkup
  const isCactusPay = paymentMethod.startsWith('cactuspay')
  const isCryptoPayment = paymentMethod === 'cryptobot' || paymentMethod === 'xrocket'
  const isStarsPayment = paymentMethod === 'telegram-stars'

  // Convert RUB to Telegram Stars (1 Star ≈ 1.8 RUB)
  const rubToStars = (rub: number) => Math.ceil(rub / 1.8)

  const bonusToUse = Math.min(user?.bonusBalance || 0, finalPrice * 0.3) // Можно использовать до 30% от суммы

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
      <Header
        title={t('checkout', language)}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 space-y-4">
        {/* Order Summary */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">
            {t('yourOrder', language)} {checkoutItems.length > 1 && `(${totalQuantity} шт.)`}
          </h2>

          <div className="space-y-3">
            {checkoutItems.map((item, index) => (
              <div key={`${item.productId}-${item.variantId || index}`} className="flex gap-4">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded-xl"
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
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-accent-cyan font-bold">
                      {formatPrice(item.price, currency)}
                    </p>
                    {item.quantity > 1 && (
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        × {item.quantity}
                      </span>
                    )}
                  </div>
                  {isCryptoPayment && (
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      ≈ {formatCryptoAmount(item.price * item.quantity, selectedCrypto)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Code - Collapsible */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border overflow-hidden">
          <button
            onClick={() => setShowPromo(!showPromo)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium text-light-text dark:text-dark-text">
                {discount > 0 ? `Промокод применён (-${discount.toLocaleString('ru-RU')} ₽)` : 'Есть промокод?'}
              </span>
            </div>
            <svg className={`w-5 h-5 text-light-text-secondary transition-transform ${showPromo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPromo && (
            <div className="px-4 pb-4 border-t border-light-border dark:border-dark-border pt-3">
              <div className="flex gap-2 items-stretch">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase())
                    setPromoError('')
                  }}
                  placeholder="Введите промокод"
                  className="flex-1 px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-4 py-3 bg-accent-cyan text-white rounded-xl font-medium hover:bg-accent-blue transition-colors whitespace-nowrap"
                >
                  OK
                </button>
              </div>
              {promoError && (
                <p className="text-red-500 text-sm mt-2">{promoError}</p>
              )}
            </div>
          )}
        </div>

        {/* Bonus Balance */}
        {user?.bonusBalance && user.bonusBalance > 0 && (
          <div className="bg-gradient-to-r from-accent-blue to-accent-cyan rounded-2xl p-4 text-white">
            <h3 className="text-base font-semibold mb-2">Бонусный баланс</h3>
            <p className="text-sm opacity-90 mb-2">
              Доступно: {user.bonusBalance} ₽
            </p>
            <p className="text-sm opacity-90">
              Можно использовать до {bonusToUse.toFixed(0)} ₽ для этого заказа
            </p>
          </div>
        )}

        {/* Payment Method - Grouped */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-light-text dark:text-dark-text px-1">
            Способ оплаты
          </h3>

          {/* Crypto Section */}
          <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border overflow-hidden">
            <div className="px-4 py-2 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
              <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Криптовалюта</span>
            </div>
            <button
              onClick={() => setPaymentMethod('cryptobot')}
              className={`w-full p-4 transition-all text-left ${
                paymentMethod === 'cryptobot'
                  ? 'bg-accent-cyan/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden ${paymentMethod === 'cryptobot' ? 'ring-2 ring-accent-cyan' : ''}`}>
                  <img
                    src="/payment-icons/cryptobot.jpg"
                    alt="CryptoBot"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">CryptoBot</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Мгновенная оплата через Telegram
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cryptobot' ? 'border-accent-cyan bg-accent-cyan' : 'border-light-border dark:border-dark-border'}`}>
                  {paymentMethod === 'cryptobot' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </button>

            {paymentMethod === 'cryptobot' && (
              <div className="px-4 pb-4 pt-2 border-t border-light-border dark:border-dark-border">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCrypto('TON')}
                    className={`flex-1 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'TON'
                        ? 'bg-accent-cyan text-white font-semibold'
                        : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/ton.svg" alt="TON" className="w-5 h-5" />
                    TON
                  </button>
                  <button
                    onClick={() => setSelectedCrypto('USDT')}
                    className={`flex-1 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'USDT'
                        ? 'bg-accent-cyan text-white font-semibold'
                        : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/usdt.svg" alt="USDT" className="w-5 h-5" />
                    USDT
                  </button>
                </div>
              </div>
            )}

            {/* XRocket */}
            <button
              onClick={() => setPaymentMethod('xrocket')}
              className={`w-full p-4 transition-all text-left border-t border-light-border dark:border-dark-border ${
                paymentMethod === 'xrocket'
                  ? 'bg-accent-cyan/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden ${paymentMethod === 'xrocket' ? 'ring-2 ring-accent-cyan' : ''}`}>
                  <img
                    src="/xrocket.jpg"
                    alt="xRocket"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">xRocket</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Криптокошелек в Telegram
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">+2%</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'xrocket' ? 'border-accent-cyan bg-accent-cyan' : 'border-light-border dark:border-dark-border'}`}>
                    {paymentMethod === 'xrocket' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
              </div>
            </button>

            {paymentMethod === 'xrocket' && (
              <div className="px-4 pb-4 pt-2 border-t border-light-border dark:border-dark-border">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCrypto('TON')}
                    className={`flex-1 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'TON'
                        ? 'bg-accent-cyan text-white font-semibold'
                        : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/ton.svg" alt="TON" className="w-5 h-5" />
                    TON
                  </button>
                  <button
                    onClick={() => setSelectedCrypto('USDT')}
                    className={`flex-1 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      selectedCrypto === 'USDT'
                        ? 'bg-accent-cyan text-white font-semibold'
                        : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
                    }`}
                  >
                    <img src="/payment-icons/usdt.svg" alt="USDT" className="w-5 h-5" />
                    USDT
                  </button>
                </div>
              </div>
            )}

            {/* Telegram Stars */}
            <button
              onClick={() => setPaymentMethod('telegram-stars')}
              className={`w-full p-4 transition-all text-left border-t border-light-border dark:border-dark-border ${
                paymentMethod === 'telegram-stars'
                  ? 'bg-accent-cyan/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden ${paymentMethod === 'telegram-stars' ? 'ring-2 ring-accent-cyan' : ''}`}>
                  <img
                    src="/stars.png"
                    alt="Telegram Stars"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">Telegram Stars</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    ≈ {rubToStars(finalPrice)} ⭐ • Встроенная оплата
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">Быстро</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'telegram-stars' ? 'border-accent-cyan bg-accent-cyan' : 'border-light-border dark:border-dark-border'}`}>
                    {paymentMethod === 'telegram-stars' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Fiat Section */}
          <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border overflow-hidden">
            <div className="px-4 py-2 bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border flex items-center justify-between">
              <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Рубли ₽</span>
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">Без комиссии</span>
            </div>

            <button
              onClick={() => setPaymentMethod('cactuspay-sbp')}
              className={`w-full p-4 transition-all text-left border-b border-light-border dark:border-dark-border ${
                paymentMethod === 'cactuspay-sbp'
                  ? 'bg-accent-cyan/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden ${paymentMethod === 'cactuspay-sbp' ? 'ring-2 ring-accent-cyan' : ''}`}>
                  <img
                    src="/payment-icons/sbp.webp"
                    alt="СБП"
                    className="w-10 h-10 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">СБП</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    QR-код или по номеру телефона
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cactuspay-sbp' ? 'border-accent-cyan bg-accent-cyan' : 'border-light-border dark:border-dark-border'}`}>
                  {paymentMethod === 'cactuspay-sbp' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('cactuspay-card')}
              className={`w-full p-4 transition-all text-left ${
                paymentMethod === 'cactuspay-card'
                  ? 'bg-accent-cyan/10'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center ${paymentMethod === 'cactuspay-card' ? 'ring-2 ring-accent-cyan' : ''}`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-light-text dark:text-dark-text">Банковская карта</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Visa, Mastercard, МИР
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cactuspay-card' ? 'border-accent-cyan bg-accent-cyan' : 'border-light-border dark:border-dark-border'}`}>
                  {paymentMethod === 'cactuspay-card' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Price Breakdown - Compact */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-light-text-secondary dark:text-dark-text-secondary">
              <span>{checkoutItems.length > 1 ? `${totalQuantity} товаров` : 'Товар'}</span>
              <span>{formatPrice(itemsTotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Скидка</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            )}
            {paymentMethod === 'cryptobot' && cryptoBotMarkup > 0 && (
              <div className="flex justify-between text-orange-500">
                <span>Комиссия CryptoBot +5%</span>
                <span>+{formatPrice(cryptoBotMarkup, currency)}</span>
              </div>
            )}
            {paymentMethod === 'xrocket' && xRocketMarkup > 0 && (
              <div className="flex justify-between text-orange-500">
                <span>Комиссия xRocket +2%</span>
                <span>+{formatPrice(xRocketMarkup, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Escrow Protection Info */}
        <EscrowExplainer variant="compact" />

        {/* Purchase Flow Steps - Task 1 */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center mb-1">
                <span className="text-accent-cyan">1</span>
              </div>
              <span className="text-light-text-secondary dark:text-dark-text-secondary text-center">
                {language === 'ru' ? 'Оплата' : 'Payment'}
              </span>
            </div>
            <div className="w-8 h-px bg-light-border dark:bg-dark-border" />
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-light-bg dark:bg-dark-bg flex items-center justify-center mb-1">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">2</span>
              </div>
              <span className="text-light-text-secondary dark:text-dark-text-secondary text-center">
                {language === 'ru' ? 'Проверка' : 'Verify'}
              </span>
            </div>
            <div className="w-8 h-px bg-light-border dark:bg-dark-border" />
            <div className="flex flex-col items-center flex-1">
              <div className="w-8 h-8 rounded-full bg-light-bg dark:bg-dark-bg flex items-center justify-center mb-1">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">3</span>
              </div>
              <span className="text-light-text-secondary dark:text-dark-text-secondary text-center">
                {language === 'ru' ? 'В чат' : 'To chat'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-center text-light-text-secondary dark:text-dark-text-secondary mt-3 opacity-70">
            {language === 'ru'
              ? 'Товар придёт в этот чат (~30 сек)'
              : 'Product delivered to this chat (~30 sec)'
            }
          </p>
        </div>

        {/* Legal Agreement Notice */}
        <div className="text-center text-[10px] text-light-text-secondary dark:text-dark-text-secondary mb-4">
          <p>
            {language === 'ru'
              ? 'Нажимая «Оплатить», вы соглашаетесь с '
              : 'By clicking "Pay", you agree to '}
            <a href="/legal/offer" className="text-accent-cyan hover:underline">
              {language === 'ru' ? 'Публичной офертой' : 'Terms of Service'}
            </a>
            {language === 'ru' ? ', ' : ', '}
            <a href="/legal/privacy" className="text-accent-cyan hover:underline">
              {language === 'ru' ? 'Политикой конфиденциальности' : 'Privacy Policy'}
            </a>
            {language === 'ru' ? ' и ' : ' and '}
            <a href="/legal/refund" className="text-accent-cyan hover:underline">
              {language === 'ru' ? 'Условиями возврата' : 'Refund Policy'}
            </a>
          </p>
        </div>
      </div>

      {/* Sticky Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-t border-light-border dark:border-dark-border safe-area-bottom">
        <div className="flex items-center gap-3">
          {/* Price summary */}
          <div className="flex-1">
            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {language === 'ru' ? 'Итого' : 'Total'}
            </div>
            <div className="text-xl font-bold text-accent-cyan">
              {formatPrice(finalPrice, currency)}
              {isCryptoPayment && (
                <span className="text-sm font-normal text-light-text-secondary dark:text-dark-text-secondary ml-1">
                  ≈ {formatCryptoAmount(finalPrice, selectedCrypto)}
                </span>
              )}
              {isStarsPayment && (
                <span className="text-sm font-normal text-light-text-secondary dark:text-dark-text-secondary ml-1">
                  ≈ {rubToStars(finalPrice)} ⭐
                </span>
              )}
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="flex-1 bg-accent-cyan text-white py-3.5 px-6 rounded-xl font-bold text-base hover:bg-accent-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{language === 'ru' ? 'Создание...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{language === 'ru' ? 'Оплатить' : 'Pay'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
