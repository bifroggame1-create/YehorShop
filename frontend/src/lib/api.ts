import axios from 'axios'
import { Product, User, Order, Review, ProductFilters, SellerProfile } from '@/types'
import { getToken } from './auth'
import { getTelegramUser } from './telegram'

// Use backend URL from environment variable, fallback to production Render URL
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://yehorshop.onrender.com').replace(/\/+$/, '')

// ============================================
// MULTI-TENANT SUPPORT
// ============================================

// Default tenant ID from environment
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'fastpay'

// Store tenant ID in memory (can be overridden by URL param or storage)
let currentTenantId: string | null = null

/**
 * Get current tenant ID
 * Priority: 1. In-memory value 2. URL param 3. localStorage 4. Environment default
 */
export function getTenantId(): string {
  // Check in-memory first
  if (currentTenantId) return currentTenantId

  // Check URL parameter (for multi-tenant testing)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const urlTenant = urlParams.get('tenant')
    if (urlTenant) {
      currentTenantId = urlTenant
      return urlTenant
    }

    // Check localStorage
    const storedTenant = localStorage.getItem('tenantId')
    if (storedTenant) {
      currentTenantId = storedTenant
      return storedTenant
    }
  }

  // Return default
  return DEFAULT_TENANT_ID
}

/**
 * Set tenant ID (call this during app initialization)
 */
export function setTenantId(tenantId: string): void {
  currentTenantId = tenantId
  if (typeof window !== 'undefined') {
    localStorage.setItem('tenantId', tenantId)
  }
}

/**
 * Clear tenant ID (for logout/tenant switch)
 */
export function clearTenantId(): void {
  currentTenantId = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tenantId')
  }
}

// ============================================
// API INSTANCES
// ============================================

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Add auth token and tenant ID to requests
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Add tenant ID header
  config.headers['X-Tenant-ID'] = getTenantId()

  return config
})

// Admin API instance - uses JWT token for authentication (secure)
const adminApiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Admin API uses JWT token and tenant ID
adminApiInstance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Add tenant ID header
  config.headers['X-Tenant-ID'] = getTenantId()

  return config
})

adminApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[AdminAPI] Error:', error.response?.status, error.response?.data)
    throw error
  }
)

// ============================================
// TENANT API - for tenant info
// ============================================

export const tenantApi = {
  // Get current tenant info (branding, settings, etc.)
  getInfo: async () => {
    const { data } = await api.get('/tenant/info')
    return data
  },

  // Get tenant billing info
  getBilling: async () => {
    const { data } = await api.get('/billing')
    return data
  },

  // Get billing plans
  getPlans: async () => {
    const { data } = await api.get('/billing/plans')
    return data
  },

  // Check if action is allowed by billing
  canPerform: async (action: 'add-product' | 'add-seller' | 'add-admin' | 'create-order') => {
    const { data } = await api.get(`/billing/can/${action}`)
    return data
  },
}

export const productsApi = {
  getAll: async (params?: ProductFilters & { category?: string; condition?: string; search?: string }) => {
    const { data } = await api.get<Product[]>('/products', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Product>(`/products/${id}`)
    return data
  },

  getFavorites: async (userId: string, favoriteIds: string[]) => {
    const { data } = await api.post<Product[]>('/products/favorites', { favoriteIds })
    return data
  },
}

export const reviewsApi = {
  getByProduct: async (productId: string) => {
    const { data } = await api.get<Review[]>(`/reviews/product/${productId}`)
    return data
  },

  create: async (review: { productId: string; userId: string; userName: string; userAvatar?: string; rating: number; text: string; orderId?: string }) => {
    const { data } = await api.post<Review>('/reviews', review)
    return data
  },

  getByUser: async (userId: string) => {
    const { data } = await api.get<Review[]>(`/reviews/user/${userId}`)
    return data
  },

  canReview: async (userId: string, productId: string) => {
    const { data } = await api.get<{ canReview: boolean; orderId?: string }>(`/reviews/can-review/${userId}/${productId}`)
    return data
  },

  getStats: async (productId: string) => {
    const { data } = await api.get<{ count: number; average: number; distribution: Record<number, number> }>(`/reviews/product/${productId}/stats`)
    return data
  },
}

export const userApi = {
  getById: async (id: string) => {
    const { data } = await api.get<User>(`/users/${id}`)
    return data
  },

  create: async (userData: Partial<User>) => {
    const { data } = await api.post<User>('/users', userData)
    return data
  },
}

export const ordersApi = {
  getByUserId: async (userId: string) => {
    const { data } = await api.get<Order[]>(`/orders/user/${userId}`)
    return data
  },

  create: async (orderData: Partial<Order>) => {
    const { data } = await api.post<Order>('/orders', orderData)
    return data
  },
}

export const promoApi = {
  validate: async (code: string, orderAmount: number) => {
    const { data } = await api.post('/promo/validate', { code, orderAmount })
    return data
  },

  getActive: async () => {
    const { data } = await api.get('/promo/active')
    return data
  },
}

export const paymentApi = {
  // CryptoBot payments
  createInvoice: async (params: {
    amount: number
    description?: string
    productId: string
    variantId?: string
    asset?: string
  }) => {
    const { data } = await api.post('/payment/create-invoice', params)
    return data
  },

  getInvoice: async (invoiceId: number) => {
    const { data } = await api.get(`/payment/invoice/${invoiceId}`)
    return data
  },

  getBalance: async () => {
    const { data } = await api.get('/payment/balance')
    return data
  },

  // CactusPay payments
  createCactusPayment: async (params: {
    amount: number
    description?: string
    productId: string
    variantId?: string
    method?: 'card' | 'sbp' | 'yoomoney' | 'crypto' | 'nspk'
    userIp?: string
  }) => {
    const { data } = await api.post('/payment/cactuspay/create', params)
    return data
  },

  getCactusPaymentStatus: async (orderId: string) => {
    const { data } = await api.get(`/payment/cactuspay/status/${orderId}`)
    return data
  },

  cancelCactusPayment: async (orderId: string) => {
    const { data } = await api.post('/payment/cactuspay/cancel', { orderId })
    return data
  },

  // XRocket payments
  createXRocketInvoice: async (params: {
    amount: number
    currency?: string
    description?: string
    productId: string
    variantId?: string
  }) => {
    const { data } = await api.post('/payment/xrocket/create-invoice', params)
    return data
  },

  getXRocketInvoice: async (invoiceId: number) => {
    const { data } = await api.get(`/payment/xrocket/invoice/${invoiceId}`)
    return data
  },

  // Telegram Stars payments
  createStarsInvoice: async (params: {
    amount: number
    description?: string
    productId: string
    variantId?: string
  }) => {
    const { data } = await api.post('/payment/stars/create-invoice', params)
    return data
  },
}

export const adminApi = {
  // Products - using adminApiInstance with X-Admin-Id header
  createProduct: async (product: any) => {
    const { data } = await adminApiInstance.post('/admin/products', product)
    return data
  },

  updateProduct: async (id: string, updates: any) => {
    const { data } = await adminApiInstance.put(`/admin/products/${id}`, updates)
    return data
  },

  deleteProduct: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/products/${id}`)
    return data
  },

  // Sellers - using adminApiInstance with X-Admin-Id header
  getSellers: async () => {
    const { data } = await adminApiInstance.get('/admin/sellers')
    return data
  },

  syncSellers: async () => {
    const { data } = await adminApiInstance.post('/admin/sellers/sync')
    return data
  },

  createSeller: async (seller: any) => {
    const { data } = await adminApiInstance.post('/admin/sellers', seller)
    return data
  },

  updateSeller: async (id: string, updates: any) => {
    const { data } = await adminApiInstance.put(`/admin/sellers/${id}`, updates)
    return data
  },

  deleteSeller: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/sellers/${id}`)
    return data
  },

  // Users - using adminApiInstance with X-Admin-Id header
  getUsers: async () => {
    const { data } = await adminApiInstance.get('/admin/users')
    return data
  },

  updateUser: async (id: string, updates: any) => {
    const { data } = await adminApiInstance.put(`/admin/users/${id}`, updates)
    return data
  },

  // Admins - using adminApiInstance with X-Admin-Id header
  getAdmins: async () => {
    const { data } = await adminApiInstance.get('/admin/admins')
    return data
  },

  addAdmin: async (admin: { userId?: string; username?: string; name?: string }) => {
    const { data } = await adminApiInstance.post('/admin/admins', admin)
    return data
  },

  removeAdmin: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/admins/${id}`)
    return data
  },

  // Promo - using adminApiInstance with X-Admin-Id header
  getPromoCodes: async () => {
    const { data } = await adminApiInstance.get('/admin/promo')
    return data
  },

  createPromoCode: async (promo: any) => {
    const { data } = await adminApiInstance.post('/admin/promo', promo)
    return data
  },

  updatePromoCode: async (code: string, updates: any) => {
    const { data } = await adminApiInstance.put(`/admin/promo/${code}`, updates)
    return data
  },

  deletePromoCode: async (code: string) => {
    const { data } = await adminApiInstance.delete(`/admin/promo/${code}`)
    return data
  },

  // Orders - using adminApiInstance with X-Admin-Id header
  getOrders: async (params?: { status?: string; userId?: string; limit?: number; offset?: number }) => {
    const { data } = await adminApiInstance.get('/admin/orders', { params })
    return data
  },

  getOrder: async (id: string) => {
    const { data } = await adminApiInstance.get(`/admin/orders/${id}`)
    return data
  },

  updateOrderStatus: async (id: string, status: string) => {
    const { data } = await adminApiInstance.put(`/admin/orders/${id}/status`, { status })
    return data
  },

  deliverOrder: async (id: string, deliveryData: string, deliveryNote?: string) => {
    const { data } = await adminApiInstance.post(`/admin/orders/${id}/deliver`, { deliveryData, deliveryNote })
    return data
  },

  cancelOrder: async (id: string) => {
    const { data } = await adminApiInstance.post(`/admin/orders/${id}/cancel`)
    return data
  },

  refundOrder: async (id: string) => {
    const { data } = await adminApiInstance.post(`/admin/orders/${id}/refund`)
    return data
  },

  getOrdersStats: async () => {
    const { data } = await adminApiInstance.get('/admin/orders/stats')
    return data
  },

  // Delivery management - using adminApiInstance with X-Admin-Id header
  getProductDelivery: async (productId: string) => {
    const { data } = await adminApiInstance.get(`/admin/products/${productId}/delivery`)
    return data
  },

  updateProductDelivery: async (productId: string, settings: {
    deliveryType?: 'manual' | 'auto'
    deliveryInstructions?: string
  }) => {
    const { data } = await adminApiInstance.put(`/admin/products/${productId}/delivery`, settings)
    return data
  },

  addDeliveryKeys: async (productId: string, keys: string[], variantId?: string) => {
    const { data } = await adminApiInstance.post(`/admin/products/${productId}/delivery/keys`, { keys, variantId })
    return data
  },

  removeDeliveryKey: async (productId: string, keyId: string) => {
    const { data } = await adminApiInstance.delete(`/admin/products/${productId}/delivery/keys/${keyId}`)
    return data
  },

  // Files - persistent storage in MongoDB
  getFiles: async () => {
    const { data } = await adminApiInstance.get('/admin/files')
    return data
  },

  uploadFile: async (file: { name: string; type: string; size: number; data: string }) => {
    const { data } = await adminApiInstance.post('/admin/files', file)
    return data
  },

  deleteFile: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/files/${id}`)
    return data
  },

  // Reviews - admin management
  getReviews: async () => {
    const { data } = await adminApiInstance.get('/admin/reviews')
    return data
  },

  createReview: async (review: { productId: string; userName: string; rating: number; text: string }) => {
    const { data } = await adminApiInstance.post('/admin/reviews', review)
    return data
  },

  updateReview: async (id: string, updates: { userName?: string; rating?: number; text?: string }) => {
    const { data } = await adminApiInstance.put(`/admin/reviews/${id}`, updates)
    return data
  },

  deleteReview: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/reviews/${id}`)
    return data
  },

  // Tags - product categorization
  getTags: async () => {
    const { data } = await adminApiInstance.get('/admin/tags')
    return data
  },

  createTag: async (tag: { name: string; color?: string }) => {
    const { data } = await adminApiInstance.post('/admin/tags', tag)
    return data
  },

  updateTag: async (id: string, updates: { name?: string; color?: string }) => {
    const { data } = await adminApiInstance.put(`/admin/tags/${id}`, updates)
    return data
  },

  deleteTag: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/tags/${id}`)
    return data
  },

  // CSV Import
  importProducts: async (csv: string) => {
    const { data } = await adminApiInstance.post('/admin/import/products', { csv })
    return data
  },

  getCSVTemplate: async () => {
    const { data } = await adminApiInstance.get('/admin/import/template')
    return data
  },

  // Extended Statistics
  getDashboardStats: async (period: string = '30d') => {
    const { data } = await adminApiInstance.get('/admin/stats/dashboard', { params: { period } })
    return data
  },

  getRevenueChart: async (period: string = '30d', groupBy: string = 'day') => {
    const { data } = await adminApiInstance.get('/admin/stats/revenue', { params: { period, groupBy } })
    return data
  },

  getOrdersChart: async (period: string = '30d', groupBy: string = 'day') => {
    const { data } = await adminApiInstance.get('/admin/stats/orders-chart', { params: { period, groupBy } })
    return data
  },

  getTopProducts: async (period: string = '30d', limit: number = 10) => {
    const { data } = await adminApiInstance.get('/admin/stats/top-products', { params: { period, limit } })
    return data
  },

  getPaymentMethodStats: async (period: string = '30d') => {
    const { data } = await adminApiInstance.get('/admin/stats/payment-methods', { params: { period } })
    return data
  },

  getUserGrowthChart: async (period: string = '30d', groupBy: string = 'day') => {
    const { data } = await adminApiInstance.get('/admin/stats/user-growth', { params: { period, groupBy } })
    return data
  },

  getCategoryStats: async (period: string = '30d') => {
    const { data } = await adminApiInstance.get('/admin/stats/categories', { params: { period } })
    return data
  },

  // 2FA Management
  setup2FA: async () => {
    const { data } = await adminApiInstance.post('/admin/2fa/setup')
    return data
  },

  enable2FA: async (code: string) => {
    const { data } = await adminApiInstance.post('/admin/2fa/enable', { code })
    return data
  },

  disable2FA: async (code: string) => {
    const { data } = await adminApiInstance.post('/admin/2fa/disable', { code })
    return data
  },

  get2FAStatus: async () => {
    const { data } = await adminApiInstance.get('/admin/2fa/status')
    return data
  },

  regenerateBackupCodes: async () => {
    const { data } = await adminApiInstance.post('/admin/2fa/backup-codes')
    return data
  },

  // Admin Roles
  getRoles: async () => {
    const { data } = await adminApiInstance.get('/admin/roles')
    return data
  },

  createRole: async (role: { name: string; description?: string; permissions: string[] }) => {
    const { data } = await adminApiInstance.post('/admin/roles', role)
    return data
  },

  updateRole: async (id: string, updates: { name?: string; description?: string; permissions?: string[] }) => {
    const { data } = await adminApiInstance.put(`/admin/roles/${id}`, updates)
    return data
  },

  deleteRole: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/roles/${id}`)
    return data
  },

  assignRole: async (adminId: string, roleId: string) => {
    const { data } = await adminApiInstance.post('/admin/roles/assign', { adminId, roleId })
    return data
  },

  getAdminRole: async (adminId: string) => {
    const { data } = await adminApiInstance.get(`/admin/roles/admin/${adminId}`)
    return data
  },

  // Webhooks
  getWebhooks: async () => {
    const { data } = await adminApiInstance.get('/admin/webhooks')
    return data
  },

  getWebhook: async (id: string) => {
    const { data } = await adminApiInstance.get(`/admin/webhooks/${id}`)
    return data
  },

  createWebhook: async (webhook: { name: string; url: string; events: string[]; isActive: boolean; headers?: Record<string, string> }) => {
    const { data } = await adminApiInstance.post('/admin/webhooks', webhook)
    return data
  },

  updateWebhook: async (id: string, updates: { name?: string; url?: string; events?: string[]; isActive?: boolean; headers?: Record<string, string> }) => {
    const { data } = await adminApiInstance.put(`/admin/webhooks/${id}`, updates)
    return data
  },

  deleteWebhook: async (id: string) => {
    const { data } = await adminApiInstance.delete(`/admin/webhooks/${id}`)
    return data
  },

  regenerateWebhookSecret: async (id: string) => {
    const { data } = await adminApiInstance.post(`/admin/webhooks/${id}/regenerate-secret`)
    return data
  },

  testWebhook: async (id: string) => {
    const { data } = await adminApiInstance.post(`/admin/webhooks/${id}/test`)
    return data
  },

  getWebhookLogs: async (id: string, limit: number = 50) => {
    const { data } = await adminApiInstance.get(`/admin/webhooks/${id}/logs`, { params: { limit } })
    return data
  },

  // Audit Logs
  getAuditLogs: async (params?: { action?: string; entityType?: string; entityId?: string; adminId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) => {
    const { data } = await adminApiInstance.get('/admin/audit-logs', { params })
    return data
  },

  getEntityAuditLogs: async (entityType: string, entityId: string, limit: number = 50, offset: number = 0) => {
    const { data } = await adminApiInstance.get(`/admin/audit-logs/${entityType}/${entityId}`, { params: { limit, offset } })
    return data
  },
}

export const chatApi = {
  createChat: async (params: {
    buyerId: string
    sellerId: string
    productId: string
    productName: string
  }) => {
    const { data } = await api.post('/chats/create', params)
    return data
  },

  getChat: async (chatId: string) => {
    const { data } = await api.get(`/chats/${chatId}`)
    return data
  },

  getUserChats: async (userId: string) => {
    const { data } = await api.get(`/chats/user/${userId}`)
    return data
  },

  getMessages: async (chatId: string, limit = 50, offset = 0) => {
    const { data } = await api.get(`/chats/${chatId}/messages`, { params: { limit, offset } })
    return data
  },

  sendMessage: async (chatId: string, params: {
    senderId: string
    senderName?: string
    content: string
    messageType?: 'text' | 'image' | 'file'
    fileUrl?: string
    fileName?: string
    fileSize?: number
  }) => {
    const { data } = await api.post(`/chats/${chatId}/messages`, params)
    return data
  },

  uploadFile: async (chatId: string, params: {
    file: string // base64
    fileName: string
    fileType: string
    senderId: string
    senderName?: string
  }) => {
    const { data } = await api.post(`/chats/${chatId}/upload`, params)
    return data
  },
}

export const referralApi = {
  // Track referral when user joins via referral link
  trackReferral: async (params: { userId: string; referrerId: string }) => {
    const { data } = await api.post('/referral/track', params)
    return data
  },

  // Get referral stats for user
  getStats: async (userId: string) => {
    const { data } = await api.get(`/referral/stats/${userId}`)
    return data
  },

  // Get list of referred users
  getReferrals: async (userId: string) => {
    const { data } = await api.get(`/referral/list/${userId}`)
    return data
  },

  // Use bonus balance for checkout
  useBonus: async (userId: string, amount: number) => {
    const { data } = await api.post('/referral/use-bonus', { userId, amount })
    return data
  },
}

// Marketplace API - seller profiles, disputes, etc.
export const marketplaceApi = {
  // Get seller public profile with reputation
  getSellerProfile: async (sellerId: string): Promise<SellerProfile> => {
    const { data } = await api.get(`/sellers/${sellerId}/profile`)
    return data
  },
}

// Seller Applications API
export const sellerApplicationsApi = {
  // Submit application (public)
  submit: async (params: {
    shopName: string
    category: string
    description: string
    telegram: string
    userId?: string
    userName?: string
  }) => {
    const { data } = await api.post('/seller-applications', params)
    return data
  },

  // Get all applications (admin only)
  getAll: async () => {
    const { data } = await adminApiInstance.get('/admin/seller-applications')
    return data
  },

  // Update application status (admin only)
  updateStatus: async (id: string, updates: {
    status: 'approved' | 'rejected'
    reviewNote?: string
  }) => {
    const { data } = await adminApiInstance.put(`/admin/seller-applications/${id}`, updates)
    return data
  },
}

export default api
