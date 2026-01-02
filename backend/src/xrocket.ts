import axios from 'axios'
import crypto from 'crypto'

const XROCKET_API_URL = 'https://pay.ton-rocket.com'

interface CreateInvoiceParams {
  amount: number
  currency: string // TONCOIN, USDT, etc.
  description?: string
  hiddenMessage?: string // Message shown after payment
  callbackUrl?: string // Webhook URL
  payload?: string // Custom data for webhook
  expiredIn?: number // Expiration in seconds
}

interface Invoice {
  id: number
  amount: number
  minPayment: number
  currency: string
  description?: string
  hiddenMessage?: string
  payload?: string
  callbackUrl?: string
  commentsEnabled: boolean
  status: 'active' | 'paid' | 'expired' | 'cancelled'
  createdAt: string
  paidAt?: string
  link: string
}

interface TransferParams {
  tgUserId: number // Telegram user ID
  currency: string // TONCOIN, USDT, etc.
  amount: number
  transferId: string // Unique identifier for idempotency
  description?: string // Optional comment
}

interface Transfer {
  id: number
  tgUserId: number
  currency: string
  amount: number
  description?: string
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

interface CreateMultiChequeParams {
  currency: string
  chequePerUser: number // Amount per user
  usersNumber: number // Number of activations
  refProgramPercents?: number // 0-100
  password?: string
  description?: string
  sendNotification?: boolean
  enableCaptcha?: boolean
  telegramResourcesIds?: string[]
  forPremium?: boolean
  linkedWallet?: boolean
  disabledLanguages?: string[]
}

interface MultiCheque {
  id: number
  currency: string
  chequePerUser: number
  usersNumber: number
  activatedNumber: number
  refProgramPercents: number
  password?: string
  description?: string
  status: 'active' | 'completed' | 'cancelled'
  link: string
  createdAt: string
}

interface WithdrawalParams {
  currency: string
  amount: number
  address: string // TON wallet address
  comment?: string
}

interface Withdrawal {
  id: number
  currency: string
  amount: number
  address: string
  status: 'pending' | 'completed' | 'failed'
  txHash?: string
  createdAt: string
}

export class XRocketAPI {
  private token: string = ''
  private apiUrl: string
  private initialized: boolean = false

  constructor(token?: string) {
    this.apiUrl = XROCKET_API_URL
    if (token) {
      this.token = token.trim().replace(/['\"]/g, '').replace(/\r?\n/g, '')
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      const envToken = process.env.XROCKET_TOKEN

      if (envToken) {
        this.token = envToken.trim().replace(/['\"]/g, '').replace(/\r?\n/g, '')

        console.log('✅ XRocket token initialized:', {
          length: this.token.length,
          preview: this.token.substring(0, 10) + '...',
        })
      } else {
        console.error('❌ XRocket token is empty or not configured. Set XROCKET_TOKEN environment variable.')
      }

      this.initialized = true
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    this.ensureInitialized()

    try {
      console.log(`XRocket API Request: ${method} ${endpoint}`, data)

      if (!this.token) {
        throw new Error('XRocket token is not configured')
      }

      const config: any = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Rocket-Pay-Key': this.token,
          'Content-Type': 'application/json',
        },
      }

      if (method === 'POST' && data) {
        config.data = data
      } else if (data) {
        config.params = data
      }

      const response = await axios(config)

      console.log('XRocket API Response:', response.data)

      if (response.data.success) {
        return response.data.data
      } else {
        const errorMsg = response.data.message || response.data.errors?.[0] || 'XRocket API error'
        console.error('XRocket API returned error:', response.data)
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('XRocket API error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  }

  // ============================================
  // APP INFO
  // ============================================

  async getVersion(): Promise<{ version: string }> {
    return this.makeRequest('GET', '/version')
  }

  async getAppInfo(): Promise<any> {
    return this.makeRequest('GET', '/app/info')
  }

  async getCoins(): Promise<any[]> {
    return this.makeRequest('GET', '/app/coins')
  }

  // ============================================
  // INVOICE METHODS
  // ============================================

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    return this.makeRequest('POST', '/tg-invoices', {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      hiddenMessage: params.hiddenMessage,
      callbackUrl: params.callbackUrl,
      payload: params.payload,
      expiredIn: params.expiredIn,
    })
  }

  async getInvoices(params?: {
    limit?: number
    offset?: number
  }): Promise<Invoice[]> {
    return this.makeRequest('GET', '/tg-invoices', params)
  }

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return this.makeRequest('GET', `/tg-invoices/${invoiceId}`)
  }

  async deleteInvoice(invoiceId: number): Promise<boolean> {
    return this.makeRequest('DELETE', `/tg-invoices/${invoiceId}`)
  }

  // ============================================
  // TRANSFER METHODS
  // ============================================

  async transfer(params: TransferParams): Promise<Transfer> {
    return this.makeRequest('POST', '/app/transfer', {
      tgUserId: params.tgUserId,
      currency: params.currency,
      amount: params.amount,
      transferId: params.transferId,
      description: params.description,
    })
  }

  async getTransfers(params?: {
    limit?: number
    offset?: number
  }): Promise<Transfer[]> {
    return this.makeRequest('GET', '/app/transfers', params)
  }

  // ============================================
  // MULTI-CHEQUE METHODS (similar to CryptoBot checks)
  // ============================================

  async createMultiCheque(params: CreateMultiChequeParams): Promise<MultiCheque> {
    return this.makeRequest('POST', '/multi-cheques', params)
  }

  async getMultiCheques(params?: {
    limit?: number
    offset?: number
  }): Promise<MultiCheque[]> {
    return this.makeRequest('GET', '/multi-cheques', params)
  }

  async getMultiCheque(chequeId: number): Promise<MultiCheque> {
    return this.makeRequest('GET', `/multi-cheques/${chequeId}`)
  }

  async editMultiCheque(chequeId: number, params: Partial<CreateMultiChequeParams>): Promise<MultiCheque> {
    return this.makeRequest('PUT', `/multi-cheques/${chequeId}`, params)
  }

  async deleteMultiCheque(chequeId: number): Promise<boolean> {
    return this.makeRequest('DELETE', `/multi-cheques/${chequeId}`)
  }

  // ============================================
  // WITHDRAWAL METHODS
  // ============================================

  async createWithdrawal(params: WithdrawalParams): Promise<Withdrawal> {
    return this.makeRequest('POST', '/app/withdrawal', params)
  }

  async getWithdrawals(params?: {
    limit?: number
    offset?: number
  }): Promise<Withdrawal[]> {
    return this.makeRequest('GET', '/app/withdrawals', params)
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async createSubscription(params: {
    currency: string
    amount: number
    interval: 'day' | 'week' | 'month' | 'year'
    name: string
    description?: string
    returnUrl?: string
  }): Promise<any> {
    return this.makeRequest('POST', '/subscriptions/create', params)
  }

  async getSubscriptions(): Promise<any[]> {
    return this.makeRequest('GET', '/subscriptions')
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

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
   * Verify webhook signature from XRocket
   * @param signature - The signature from 'rocket-pay-signature' header
   * @param body - Raw request body as string
   * @returns true if signature is valid
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    this.ensureInitialized()

    if (!this.token || !signature) {
      return false
    }

    try {
      // XRocket uses SHA-256 HMAC with token as key
      const expectedSignature = crypto.createHmac('sha256', this.token)
        .update(body)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('XRocket webhook signature verification failed:', error)
      return false
    }
  }
}

export const xRocket = new XRocketAPI()
