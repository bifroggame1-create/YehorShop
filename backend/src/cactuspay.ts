import axios from 'axios'

const CACTUSPAY_API_URL = 'https://lk.cactuspay.pro/api/'

export type PaymentMethod = 'card' | 'sbp' | 'yoomoney' | 'crypto' | 'nspk'

export type PaymentStatus = 'WAIT' | 'ACCEPT'

interface CreatePaymentParams {
  amount: number
  order_id?: string
  description?: string
  h2h?: boolean
  user_ip?: string
  method?: PaymentMethod
}

interface PaymentRequisite {
  status: string
  response: {
    until: string
    until_timestamp: number
    amount: number
    receiverQR?: string
    order_id: string
  }
}

interface CreatePaymentResponse {
  status: 'success' | 'error'
  response?: {
    url: string
    requisite?: PaymentRequisite
  }
  error?: string
}

interface GetPaymentResponse {
  status: 'success' | 'error'
  response?: {
    id: number
    order_id: string
    amount: string
    status: PaymentStatus
  }
  error?: string
}

interface CancelDetailsResponse {
  status: 'success' | 'error'
  error?: string
}

export class CactusPayAPI {
  private token: string = ''
  private apiUrl: string
  private initialized: boolean = false

  constructor(token?: string) {
    this.apiUrl = CACTUSPAY_API_URL
    if (token) {
      this.token = token.trim()
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      // Lazy load token from environment (after dotenv has loaded)
      const envToken = process.env.CACTUSPAY_TOKEN

      if (envToken) {
        this.token = envToken.trim()
        console.log('✅ CactusPay token initialized:', {
          length: this.token.length,
          preview: this.token.substring(0, 8) + '...'
        })
      } else {
        console.warn('⚠️ CactusPay token is not configured. Set CACTUSPAY_TOKEN environment variable.')
      }
      this.initialized = true
    }
  }

  private async makeRequest<T>(method: string, data?: any): Promise<T> {
    this.ensureInitialized()

    try {
      if (!this.token) {
        throw new Error('CactusPay token is not configured')
      }

      const url = `${this.apiUrl}?method=${method}`

      console.log(`CactusPay API Request: POST ${url}`, { ...data, token: '***' })

      const response = await axios({
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          token: this.token,
          ...data,
        },
      })

      console.log('CactusPay API Response:', response.data)

      if (response.data.status === 'success') {
        return response.data as T
      } else {
        throw new Error(response.data.error || 'CactusPay API error')
      }
    } catch (error: any) {
      console.error('CactusPay API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw error
    }
  }

  /**
   * Create a new payment
   * @param params Payment parameters
   * @returns Payment URL and details
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    const orderId = params.order_id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return this.makeRequest<CreatePaymentResponse>('create', {
      amount: params.amount,
      order_id: orderId,
      description: params.description,
      h2h: params.h2h,
      user_ip: params.user_ip,
      method: params.method,
    })
  }

  /**
   * Get payment status by order_id
   * @param orderId Unique payment identifier in your system
   * @returns Payment status
   */
  async getPaymentStatus(orderId: string): Promise<GetPaymentResponse> {
    return this.makeRequest<GetPaymentResponse>('get', {
      order_id: orderId,
    })
  }

  /**
   * Cancel H2H transaction details before expiration
   * @param orderId Unique payment identifier
   * @returns Cancellation result
   */
  async cancelDetails(orderId: string): Promise<CancelDetailsResponse> {
    return this.makeRequest<CancelDetailsResponse>('CANCEL_DETAILS', {
      order_id: orderId,
    })
  }

  /**
   * Check if payment is completed
   * @param orderId Order ID to check
   * @returns true if payment is accepted
   */
  async isPaymentCompleted(orderId: string): Promise<boolean> {
    try {
      const result = await this.getPaymentStatus(orderId)
      return result.response?.status === 'ACCEPT'
    } catch {
      return false
    }
  }

  /**
   * Check if CactusPay is configured
   * @returns true if token is available
   */
  isConfigured(): boolean {
    this.ensureInitialized()
    return !!this.token
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(): { configured: boolean; length: number; preview: string } {
    this.ensureInitialized()
    return {
      configured: !!this.token,
      length: this.token.length,
      preview: this.token ? this.token.substring(0, 8) + '...' : 'not set',
    }
  }
}

export const cactusPay = new CactusPayAPI()
