import axios from 'axios'
import { redis, CACHE_KEYS, CACHE_TTL } from './redis'
import { logger } from './logger'

// Crypto currency converter for RUB to crypto

// Fallback exchange rates (used when API is unavailable)
const FALLBACK_RATES = {
  TON: 285,
  USDT: 105,
  BTC: 10500000,
  ETH: 370000,
  LTC: 11000,
  USDC: 105,
}

// Live exchange rates (updated periodically)
let liveRates: Record<string, number> = { ...FALLBACK_RATES }
let lastUpdate: Date | null = null
let updateInterval: NodeJS.Timeout | null = null

export type CryptoAsset = 'TON' | 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'USDC'

// CoinGecko API IDs for our supported coins
const COINGECKO_IDS: Record<CryptoAsset, string> = {
  TON: 'the-open-network',
  USDT: 'tether',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LTC: 'litecoin',
  USDC: 'usd-coin',
}

// Update interval (5 minutes)
const UPDATE_INTERVAL_MS = 5 * 60 * 1000

/**
 * Fetch current exchange rates from CoinGecko API
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',')
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=rub`,
      { timeout: 10000 }
    )

    const rates: Record<string, number> = {}

    for (const [asset, cgId] of Object.entries(COINGECKO_IDS)) {
      if (response.data[cgId]?.rub) {
        rates[asset] = response.data[cgId].rub
      } else {
        // Use fallback for this asset
        rates[asset] = FALLBACK_RATES[asset as CryptoAsset]
      }
    }

    logger.info({ rates, source: 'coingecko' }, 'Exchange rates updated')
    return rates
  } catch (error: any) {
    logger.warn({ err: error }, 'Failed to fetch exchange rates from CoinGecko, using fallback')
    return FALLBACK_RATES
  }
}

/**
 * Update rates and cache them
 */
async function updateRates(): Promise<void> {
  try {
    const rates = await fetchExchangeRates()
    liveRates = rates
    lastUpdate = new Date()

    // Cache in Redis if available
    await redis.set(CACHE_KEYS.EXCHANGE_RATES, {
      rates,
      updatedAt: lastUpdate.toISOString()
    }, CACHE_TTL.EXCHANGE_RATES * 2) // Cache for 2x the update interval

    logger.info({ updatedAt: lastUpdate }, 'Exchange rates cached')
  } catch (error) {
    logger.error({ err: error }, 'Failed to update exchange rates')
  }
}

/**
 * Initialize exchange rate updater
 */
export async function initExchangeRates(): Promise<void> {
  // Try to load from cache first
  const cached = await redis.get<{ rates: Record<string, number>, updatedAt: string }>(
    CACHE_KEYS.EXCHANGE_RATES
  )

  if (cached && cached.rates) {
    liveRates = cached.rates
    lastUpdate = new Date(cached.updatedAt)
    logger.info({ updatedAt: lastUpdate }, 'Exchange rates loaded from cache')
  } else {
    // Fetch fresh rates
    await updateRates()
  }

  // Set up periodic updates
  if (!updateInterval) {
    updateInterval = setInterval(updateRates, UPDATE_INTERVAL_MS)
    logger.info({ intervalMs: UPDATE_INTERVAL_MS }, 'Exchange rate auto-update started')
  }
}

/**
 * Stop the exchange rate updater
 */
export function stopExchangeRates(): void {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
    logger.info('Exchange rate auto-update stopped')
  }
}

/**
 * Get current exchange rates
 */
export function getExchangeRates(): {
  rates: Record<string, number>
  lastUpdate: string | null
} {
  return {
    rates: liveRates,
    lastUpdate: lastUpdate?.toISOString() || null
  }
}

/**
 * Force refresh exchange rates
 */
export async function refreshExchangeRates(): Promise<Record<string, number>> {
  await updateRates()
  return liveRates
}

/**
 * Convert RUB amount to crypto amount
 * @param rubAmount Amount in Russian Rubles
 * @param asset Crypto asset (TON, USDT, BTC, etc.)
 * @returns Amount in crypto with proper precision
 */
export function convertRubToCrypto(rubAmount: number, asset: CryptoAsset): string {
  const rate = liveRates[asset] || FALLBACK_RATES[asset]
  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  const cryptoAmount = rubAmount / rate

  // Set precision based on crypto type
  let precision = 2
  if (asset === 'BTC' || asset === 'ETH') {
    precision = 8 // High precision for expensive coins
  } else if (asset === 'TON') {
    precision = 4
  }

  return cryptoAmount.toFixed(precision)
}

/**
 * Convert crypto amount to RUB
 */
export function convertCryptoToRub(cryptoAmount: number, asset: CryptoAsset): number {
  const rate = liveRates[asset] || FALLBACK_RATES[asset]
  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  return Math.round(cryptoAmount * rate)
}

/**
 * Get minimum payment amount for crypto asset
 */
export function getMinimumAmount(asset: CryptoAsset): string {
  const minimums: Record<CryptoAsset, string> = {
    TON: '0.1',
    USDT: '1',
    BTC: '0.00001',
    ETH: '0.001',
    LTC: '0.01',
    USDC: '1',
  }

  return minimums[asset] || '1'
}

/**
 * Format crypto amount for display
 */
export function formatCryptoAmount(amount: string, asset: CryptoAsset): string {
  return `${amount} ${asset}`
}
