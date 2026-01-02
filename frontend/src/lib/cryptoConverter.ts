// Crypto currency converter for display purposes

// Same rates as backend
const EXCHANGE_RATES = {
  TON: 285,      // 1 TON ≈ 285 RUB
  USDT: 105,     // 1 USDT ≈ 105 RUB
  BTC: 10500000, // 1 BTC ≈ 10,500,000 RUB
  ETH: 370000,   // 1 ETH ≈ 370,000 RUB
  LTC: 11000,    // 1 LTC ≈ 11,000 RUB
  USDC: 105,     // 1 USDC ≈ 105 RUB
}

export type CryptoAsset = 'TON' | 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'USDC'

/**
 * Convert RUB amount to crypto amount
 */
export function convertRubToCrypto(rubAmount: number, asset: CryptoAsset): string {
  const rate = EXCHANGE_RATES[asset]
  if (!rate) {
    throw new Error(`Unknown crypto asset: ${asset}`)
  }

  const cryptoAmount = rubAmount / rate

  // Set precision based on crypto type
  let precision = 2
  if (asset === 'BTC' || asset === 'ETH') {
    precision = 8
  } else if (asset === 'TON') {
    precision = 4
  }

  return cryptoAmount.toFixed(precision)
}

/**
 * Format crypto amount with symbol
 */
export function formatCryptoAmount(rubAmount: number, asset: CryptoAsset): string {
  const amount = convertRubToCrypto(rubAmount, asset)
  return `${amount} ${asset}`
}

/**
 * Get crypto symbol emoji
 */
export function getCryptoSymbol(asset: CryptoAsset): string {
  const symbols: Record<CryptoAsset, string> = {
    TON: '💎',
    USDT: '🟢',
    BTC: '₿',
    ETH: 'Ξ',
    LTC: 'Ł',
    USDC: '🟢',
  }
  return symbols[asset] || ''
}
