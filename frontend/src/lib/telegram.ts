declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
            photo_url?: string
          }
          query_id?: string
          auth_date?: number
          hash?: string
          start_param?: string
        }
        colorScheme: 'light' | 'dark'
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
      }
    }
  }
}

export const useTelegramWebApp = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.Telegram?.WebApp || null
}

// SECURITY: Removed hardcoded admin ID - admin status must be verified by backend via JWT

export const getTelegramUser = () => {
  const webApp = useTelegramWebApp()

  if (webApp) {
    const user = webApp.initDataUnsafe.user
    if (user) {
      return {
        id: user.id.toString(),
        name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
        username: user.username,
        avatar: user.photo_url,
        languageCode: user.language_code,
      }
    }
  }

  // SECURITY: No localStorage fallback - authentication must go through backend
  return null
}

export const getTelegramStartParam = () => {
  const webApp = useTelegramWebApp()
  if (!webApp) return null

  return webApp.initDataUnsafe.start_param || null
}

export const initTelegramWebApp = () => {
  const webApp = useTelegramWebApp()
  if (!webApp) return

  webApp.ready()
  webApp.expand()

  // Set theme colors
  if (webApp.colorScheme === 'dark') {
    document.documentElement.classList.add('dark')
  }
}

// Haptic feedback functions
export const hapticImpact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
  try {
    const webApp = useTelegramWebApp()
    webApp?.HapticFeedback?.impactOccurred(style)
  } catch (e) {
    // Silently fail if haptic feedback is not available
  }
}

export const hapticNotification = (type: 'error' | 'success' | 'warning') => {
  try {
    const webApp = useTelegramWebApp()
    webApp?.HapticFeedback?.notificationOccurred(type)
  } catch (e) {
    // Silently fail if haptic feedback is not available
  }
}

// Get raw initData for backend validation
export const getTelegramInitData = (): string | null => {
  const webApp = useTelegramWebApp()
  if (!webApp) return null
  return webApp.initData || null
}

