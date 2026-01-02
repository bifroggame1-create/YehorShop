import axios from 'axios'

const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

interface CreateInvoiceLinkParams {
  title: string
  description: string
  payload: string // Custom data for webhook
  prices: { label: string; amount: number }[] // Amount in Stars (integer)
  subscription_period?: number // For subscriptions
}

interface InvoiceLinkResponse {
  ok: boolean
  result?: string // The invoice link
  error_code?: number
  description?: string
}

export class TelegramStarsAPI {
  private botToken: string = ''
  private apiUrl: string = ''
  private initialized: boolean = false

  constructor(token?: string) {
    if (token) {
      this.botToken = token.trim().replace(/['\"]/g, '').replace(/\r?\n/g, '')
      this.apiUrl = `${TELEGRAM_API_URL}${this.botToken}`
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      const envToken = process.env.BOT_TOKEN

      if (envToken) {
        this.botToken = envToken.trim().replace(/['\"]/g, '').replace(/\r?\n/g, '')
        this.apiUrl = `${TELEGRAM_API_URL}${this.botToken}`

        console.log('✅ Telegram Stars initialized:', {
          length: this.botToken.length,
          preview: this.botToken.substring(0, 10) + '...',
        })
      } else {
        console.error('❌ BOT_TOKEN is empty or not configured.')
      }

      this.initialized = true
    }
  }

  private async makeRequest(method: string, data?: any) {
    this.ensureInitialized()

    try {
      console.log(`Telegram API Request: ${method}`, data)

      if (!this.botToken) {
        throw new Error('BOT_TOKEN is not configured')
      }

      const response = await axios.post(`${this.apiUrl}/${method}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Telegram API Response:', response.data)

      if (response.data.ok) {
        return response.data.result
      } else {
        const errorMsg = response.data.description || 'Telegram API error'
        console.error('Telegram API returned error:', response.data)
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('Telegram API error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  }

  /**
   * Create an invoice link for Telegram Stars payment
   * Currency is always XTR (Telegram Stars)
   * provider_token must be empty for Stars
   */
  async createInvoiceLink(params: CreateInvoiceLinkParams): Promise<string> {
    return this.makeRequest('createInvoiceLink', {
      title: params.title,
      description: params.description,
      payload: params.payload,
      provider_token: '', // Must be empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency
      prices: params.prices,
      subscription_period: params.subscription_period,
    })
  }

  /**
   * Send invoice directly to a user
   */
  async sendInvoice(chatId: number, params: CreateInvoiceLinkParams): Promise<any> {
    return this.makeRequest('sendInvoice', {
      chat_id: chatId,
      title: params.title,
      description: params.description,
      payload: params.payload,
      provider_token: '', // Must be empty for Telegram Stars
      currency: 'XTR',
      prices: params.prices,
    })
  }

  /**
   * Answer pre-checkout query (must be called within 10 seconds)
   */
  async answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, errorMessage?: string): Promise<boolean> {
    return this.makeRequest('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      error_message: errorMessage,
    })
  }

  /**
   * Refund a successful payment in Telegram Stars
   */
  async refundStarPayment(userId: number, telegramPaymentChargeId: string): Promise<boolean> {
    return this.makeRequest('refundStarPayment', {
      user_id: userId,
      telegram_payment_charge_id: telegramPaymentChargeId,
    })
  }

  /**
   * Get star transactions for the bot
   */
  async getStarTransactions(offset?: number, limit?: number): Promise<any> {
    return this.makeRequest('getStarTransactions', {
      offset,
      limit: limit || 100,
    })
  }

  isConfigured(): boolean {
    this.ensureInitialized()
    return !!this.botToken
  }

  getTokenInfo(): { configured: boolean; length: number; preview: string } {
    this.ensureInitialized()
    return {
      configured: !!this.botToken,
      length: this.botToken.length,
      preview: this.botToken ? this.botToken.substring(0, 10) + '...' : 'not set'
    }
  }
}

export const telegramStars = new TelegramStarsAPI()

/**
 * Convert RUB to Telegram Stars
 * Approximate rate: 1 Star ≈ 1.5-2 RUB (varies)
 * Using 1.8 RUB per Star as average
 */
export function rubToStars(rubAmount: number): number {
  const RATE = 1.8 // 1 Star = ~1.8 RUB
  return Math.ceil(rubAmount / RATE)
}

/**
 * Convert Telegram Stars to RUB
 */
export function starsToRub(starsAmount: number): number {
  const RATE = 1.8
  return Math.round(starsAmount * RATE)
}
