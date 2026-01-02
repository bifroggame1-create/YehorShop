import axios from 'axios'
import crypto from 'crypto'

const CRYPTOBOT_API_URL = 'https://pay.crypt.bot/api'

// No fallback token - must be configured via environment variables

interface CreateInvoiceParams {
  asset: string // Currency code (USDT, TON, BTC, etc.)
  amount: string | number // Amount as string or number (will be converted to string)
  description?: string
  paid_btn_name?: 'viewItem' | 'openChannel' | 'openBot' | 'callback'
  paid_btn_url?: string
  payload?: string
  allow_comments?: boolean
  allow_anonymous?: boolean
  expires_in?: number // Invoice expiration time in seconds (1-2678400)
}

interface CreateCheckParams {
  asset: string // Currency code (USDT, TON, BTC, etc.)
  amount: string | number // Amount in float
  pin_to_user_id?: number // Telegram user ID who can activate
  pin_to_username?: string // Username who can activate
}

interface Check {
  check_id: number
  hash: string
  asset: string
  amount: string
  bot_check_url: string
  status: 'active' | 'activated'
  created_at: string
  activated_at?: string
}

interface TransferParams {
  user_id: number // Recipient Telegram ID
  asset: string // Currency code
  amount: string | number // Amount in float
  spend_id: string // Unique identifier for idempotency (max 64 chars)
  comment?: string // Optional comment (max 1024 chars)
  disable_send_notification?: boolean
}

interface Transfer {
  transfer_id: number
  spend_id: string
  user_id: number
  asset: string
  amount: string
  status: 'completed'
  completed_at: string
  comment?: string
}

interface Invoice {
  invoice_id: number
  hash: string
  currency_type: string
  asset: string
  amount: string
  pay_url: string
  bot_invoice_url: string
  description?: string
  status: 'active' | 'paid' | 'expired'
  created_at: string
  allow_comments: boolean
  allow_anonymous: boolean
}

export class CryptoBotAPI {
  private token: string = ''
  private apiUrl: string
  private initialized: boolean = false

  constructor(token?: string) {
    this.apiUrl = CRYPTOBOT_API_URL
    if (token) {
      this.token = token.trim().replace(/['"]/g, '').replace(/\r?\n/g, '')
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      // Lazy load token from environment (after dotenv has loaded)
      const envToken = process.env.CRYPTOBOT_TOKEN

      if (envToken) {
        this.token = envToken.trim().replace(/['"]/g, '').replace(/\r?\n/g, '')

        // Validate token format
        const isValidFormat = /^\d+:[A-Za-z0-9_-]+$/.test(this.token)

        console.log('✅ CryptoBot token initialized:', {
          length: this.token.length,
          preview: this.token.substring(0, 10) + '...',
          formatValid: isValidFormat
        })

        if (!isValidFormat) {
          console.warn('⚠️ CryptoBot token format looks invalid. Expected format: 12345:ABCDEF...')
        }
      } else {
        console.error('❌ CryptoBot token is empty or not configured. Set CRYPTOBOT_TOKEN environment variable.')
      }

      this.initialized = true
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    this.ensureInitialized()

    try {
      console.log(`CryptoBot API Request: ${method} ${endpoint}`, data)

      if (!this.token) {
        throw new Error('CryptoBot token is not configured')
      }

      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Crypto-Pay-API-Token': this.token,
          'Content-Type': 'application/json',
        },
        data,
      })

      console.log('CryptoBot API Response:', response.data)

      if (response.data.ok) {
        return response.data.result
      } else {
        const errorMsg = response.data.error?.name || 'CryptoBot API error'
        console.error('CryptoBot API returned error:', response.data.error)
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('CryptoBot API error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    // Ensure amount is a string
    const requestParams = {
      ...params,
      amount: String(params.amount),
    }
    return this.makeRequest('POST', '/createInvoice', requestParams)
  }

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return this.makeRequest('GET', `/getInvoices?invoice_ids=${invoiceId}`)
  }

  async getInvoices(params?: {
    asset?: string
    invoice_ids?: string
    status?: 'active' | 'paid' | 'expired'
    offset?: number
    count?: number
  }): Promise<{ items: Invoice[] }> {
    const queryParams = new URLSearchParams(params as any).toString()
    return this.makeRequest('GET', `/getInvoices?${queryParams}`)
  }

  async getMe(): Promise<any> {
    return this.makeRequest('GET', '/getMe')
  }

  async getBalance(): Promise<any> {
    return this.makeRequest('GET', '/getBalance')
  }

  async getExchangeRates(): Promise<any> {
    return this.makeRequest('GET', '/getExchangeRates')
  }

  async getCurrencies(): Promise<any> {
    return this.makeRequest('GET', '/getCurrencies')
  }

  // ============================================
  // CHECK METHODS
  // ============================================

  /**
   * Create a check that users can activate to receive crypto
   */
  async createCheck(params: CreateCheckParams): Promise<Check> {
    const requestParams = {
      ...params,
      amount: String(params.amount),
    }
    return this.makeRequest('POST', '/createCheck', requestParams)
  }

  /**
   * Get list of checks
   */
  async getChecks(params?: {
    asset?: string
    check_ids?: string
    status?: 'active' | 'activated'
    offset?: number
    count?: number
  }): Promise<{ items: Check[] }> {
    const queryParams = new URLSearchParams(params as any).toString()
    return this.makeRequest('GET', `/getChecks?${queryParams}`)
  }

  /**
   * Delete a check by ID
   */
  async deleteCheck(checkId: number): Promise<boolean> {
    return this.makeRequest('POST', '/deleteCheck', { check_id: checkId })
  }

  // ============================================
  // TRANSFER METHODS
  // ============================================

  /**
   * Send crypto from app balance to a Telegram user
   * Note: Must be enabled in CryptoBot app security settings
   */
  async transfer(params: TransferParams): Promise<Transfer> {
    const requestParams = {
      ...params,
      amount: String(params.amount),
    }
    return this.makeRequest('POST', '/transfer', requestParams)
  }

  /**
   * Get list of completed transfers
   */
  async getTransfers(params?: {
    asset?: string
    transfer_ids?: string
    offset?: number
    count?: number
  }): Promise<{ items: Transfer[] }> {
    const queryParams = new URLSearchParams(params as any).toString()
    return this.makeRequest('GET', `/getTransfers?${queryParams}`)
  }

  isConfigured(): boolean {
    this.ensureInitialized()
    return !!this.token
  }

  getTokenInfo(): { configured: boolean; length: number; preview: string } {
    this.ensureInitialized()
    return {
      configured: !!this.token,
      length: this.token.length,
      preview: this.token ? this.token.substring(0, 10) + '...' : 'not set'
    }
  }

  /**
   * Verify webhook signature from CryptoBot
   * @param signature - The signature from 'crypto-pay-api-signature' header
   * @param body - Raw request body as string
   * @returns true if signature is valid
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    this.ensureInitialized()

    if (!this.token || !signature) {
      return false
    }

    try {
      // CryptoBot uses SHA-256 HMAC with token hash as key
      const tokenHash = crypto.createHash('sha256').update(this.token).digest()
      const expectedSignature = crypto.createHmac('sha256', tokenHash)
        .update(body)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }
}

export const cryptoBot = new CryptoBotAPI()
