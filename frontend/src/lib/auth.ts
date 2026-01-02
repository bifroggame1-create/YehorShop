/**
 * Authentication module - Simple and reliable
 * Works in Telegram Mini App and browser environments
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://yehorshop.onrender.com').replace(/\/+$/, '')
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'yehorshop'

// Debug logging (disabled in production)
const DEBUG = process.env.NODE_ENV === 'development'
const log = (...args: any[]) => DEBUG && console.log(...args)
const logError = (...args: any[]) => DEBUG && console.error(...args)

// Storage keys
// SECURITY: Admin status is stored only in USER object, never as separate flag
const STORAGE = {
  TOKEN: 'fp_token',
  USER: 'fp_user'
}

export interface AuthUser {
  id: string
  name: string
  username?: string
  avatar?: string
  isAdmin: boolean
}

// In-memory cache
let cachedUser: AuthUser | null = null
let cachedToken: string | null = null

/**
 * Get Telegram WebApp user data
 */
function getTelegramUser(): { id: string; firstName: string; username?: string } | null {
  if (typeof window === 'undefined') return null

  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user
      return {
        id: String(user.id),
        firstName: user.first_name,
        username: user.username
      }
    }
  } catch (e) {
    logError('Error getting Telegram user:', e)
  }

  return null
}

/**
 * Get Telegram initData for backend validation
 */
function getTelegramInitData(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const tg = (window as any).Telegram?.WebApp
    return tg?.initData || null
  } catch (e) {
    return null
  }
}

/**
 * Save auth data to localStorage
 * SECURITY: Admin status is stored only within user object
 */
function saveAuth(token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return

  cachedToken = token
  cachedUser = user

  localStorage.setItem(STORAGE.TOKEN, token)
  localStorage.setItem(STORAGE.USER, JSON.stringify(user))
  // SECURITY: Removed separate admin flag - admin status only in user object
}

/**
 * Load auth data from localStorage
 */
function loadAuth(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null }

  if (cachedToken && cachedUser) {
    return { token: cachedToken, user: cachedUser }
  }

  const token = localStorage.getItem(STORAGE.TOKEN)
  const userStr = localStorage.getItem(STORAGE.USER)

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as AuthUser
      cachedToken = token
      cachedUser = user
      return { token, user }
    } catch (e) {
      // Invalid data
    }
  }

  return { token: null, user: null }
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  cachedToken = null
  cachedUser = null

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE.TOKEN)
    localStorage.removeItem(STORAGE.USER)
    // Also clean up legacy admin flag if it exists
    localStorage.removeItem('fp_admin')
  }
}

/**
 * Get current token
 */
export function getToken(): string | null {
  const { token } = loadAuth()
  return token
}

/**
 * Get current user
 */
export function getUser(): AuthUser | null {
  const { user } = loadAuth()
  return user
}

/**
 * Check if current user is admin (local check only, for UI purposes)
 * SECURITY: This is only for UI display. Backend ALWAYS verifies admin status via JWT.
 * Never trust this for actual authorization - backend middleware enforces access control.
 */
export function isAdmin(): boolean {
  // Only trust cached user from authenticated session
  if (cachedUser?.isAdmin) return true

  // Check user object from authenticated session (not raw localStorage flags)
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(STORAGE.USER)
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        // Only trust isAdmin if we also have a valid token
        if (user.isAdmin && localStorage.getItem(STORAGE.TOKEN)) {
          return true
        }
      } catch (e) {}
    }
  }

  return false
}

/**
 * Authenticate with backend
 * Returns true if successful, false otherwise
 */
export async function authenticate(): Promise<boolean> {
  log('🔐 Starting authentication...')

  // Try to get Telegram data
  let initData = getTelegramInitData()
  const tgUser = getTelegramUser()

  log('🔐 Telegram data:', {
    hasInitData: !!initData,
    initDataLength: initData?.length || 0,
    tgUser
  })

  // If no initData but have user, construct it
  if ((!initData || initData.length === 0) && tgUser) {
    const userJson = JSON.stringify({
      id: parseInt(tgUser.id),
      first_name: tgUser.firstName,
      username: tgUser.username
    })
    initData = `user=${encodeURIComponent(userJson)}&auth_date=${Math.floor(Date.now() / 1000)}`
    log('🔐 Constructed initData from user')
  }

  // If still no data, cannot authenticate
  if (!initData || initData.length === 0) {
    logError('❌ No Telegram data available')
    return false
  }

  try {
    // Call backend
    const response = await fetch(`${API_URL}/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify({ initData })
    })

    const data = await response.json()
    log('🔐 Auth response:', data)

    if (data.success && data.token && data.user) {
      const user: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        avatar: data.user.avatar,
        isAdmin: data.user.isAdmin === true
      }

      saveAuth(data.token, user)
      log('✅ Authenticated:', user.name, 'isAdmin:', user.isAdmin)
      return true
    }

    logError('❌ Auth failed:', data.error)
    return false
  } catch (error) {
    logError('❌ Auth error:', error)
    return false
  }
}

/**
 * Verify existing token and get fresh admin status
 */
export async function verifyToken(): Promise<boolean> {
  const { token } = loadAuth()
  if (!token) return false

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      }
    })

    const data = await response.json()

    if (data.success && data.user) {
      // Update admin status
      const currentUser = getUser()
      if (currentUser) {
        currentUser.isAdmin = data.user.isAdmin === true
        saveAuth(token, currentUser)
      }
      return true
    }

    return false
  } catch (error) {
    logError('Token verification error:', error)
    return false
  }
}

/**
 * Refresh admin status directly from backend
 * SECURITY: Requires valid JWT token - removed userId/username params to prevent enumeration
 */
async function refreshAdminStatus(): Promise<boolean> {
  try {
    const token = getToken()
    if (!token) {
      log('🔐 No token for admin refresh')
      return false
    }

    log('🔐 Refreshing admin status via JWT...')
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      }
    })
    const data = await response.json()
    log('🔐 Refresh response:', data)

    if (data.success && data.isAdmin) {
      if (cachedUser) {
        cachedUser.isAdmin = true
        // Update stored user
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE.USER, JSON.stringify(cachedUser))
        }
      }
      return true
    }
    return false
  } catch (error) {
    logError('❌ Refresh admin status error:', error)
    return false
  }
}

/**
 * Initialize auth - call on app start
 * Tries to authenticate or verify existing token
 */
export async function initAuth(): Promise<AuthUser | null> {
  log('🔐 Initializing auth...')

  // Get Telegram user first (we need this for fallback)
  const tgUser = getTelegramUser()
  log('🔐 Telegram user:', tgUser)

  // First try to verify existing token
  const { token, user } = loadAuth()

  if (token) {
    log('🔐 Found existing token, verifying...')
    const valid = await verifyToken()
    if (valid) {
      log('✅ Token valid, user:', getUser()?.name)
      return getUser()
    }
    log('🔐 Token invalid, re-authenticating...')
    clearAuth()
  }

  // Authenticate fresh
  const success = await authenticate()

  if (success) {
    return getUser()
  }

  // SECURITY: No fallback without proper authentication
  // If Telegram auth failed, user must re-authenticate
  if (tgUser) {
    log('🔐 Auth failed - user must re-authenticate via Telegram')
  }

  return null
}

// Export for compatibility
export const getAuthUser = getUser
export const forceReauth = clearAuth
export const getStoredAdminStatus = isAdmin
