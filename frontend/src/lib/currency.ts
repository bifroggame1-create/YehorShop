// Currency conversion and formatting

export type Currency = 'RUB' | 'USD' | 'EUR'

// Exchange rates (base: RUB) - Updated December 2025
const EXCHANGE_RATES: Record<Currency, number> = {
  RUB: 1,
  USD: 0.0095, // 1 RUB ≈ 0.0095 USD (105 RUB per 1 USD)
  EUR: 0.0088, // 1 RUB ≈ 0.0088 EUR (114 RUB per 1 EUR)
}

// Currency symbols
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€'
}

// Convert price from RUB to target currency
export function convertPrice(priceInRUB: number, targetCurrency: Currency): number {
  const rate = EXCHANGE_RATES[targetCurrency]
  return Math.round(priceInRUB * rate * 100) / 100
}

// Format price with currency symbol
export function formatPrice(priceInRUB: number, currency: Currency, locale: string = 'ru-RU'): string {
  const convertedPrice = convertPrice(priceInRUB, currency)
  const symbol = CURRENCY_SYMBOLS[currency]

  if (currency === 'RUB') {
    return `${convertedPrice.toLocaleString(locale)} ${symbol}`
  } else if (currency === 'USD' || currency === 'EUR') {
    return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return `${convertedPrice.toLocaleString(locale)} ${symbol}`
}
