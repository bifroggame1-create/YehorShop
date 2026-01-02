import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product, User, SortType } from '@/types'

export interface CartItem {
  productId: string
  productName: string
  productImage: string
  variantId?: string
  variantName?: string
  price: number
  quantity: number
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  type: 'text' | 'system' | 'notification'
}

export interface Chat {
  id: string
  type: 'seller' | 'support' | 'notification'
  title: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unread: number
  sellerId?: string
  productId?: string
}

interface AppState {
  user: User | null
  isAdmin: boolean
  favorites: string[]
  selectedCategory: string
  selectedFilter: 'all' | 'new' | 'used'
  searchQuery: string
  theme: 'light' | 'dark'
  language: 'ru' | 'en'
  currency: 'RUB' | 'USD' | 'EUR'

  // Filters & Sorting
  sortBy: SortType

  // Chats
  chats: Chat[]
  messages: ChatMessage[]
  unreadChats: number

  // Cart
  cart: CartItem[]
  cartTotal: number

  setUser: (user: User | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  toggleFavorite: (productId: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedFilter: (filter: 'all' | 'new' | 'used') => void
  setSearchQuery: (query: string) => void
  toggleTheme: () => void
  setLanguage: (language: 'ru' | 'en') => void
  setCurrency: (currency: 'RUB' | 'USD' | 'EUR') => void
  isFavorite: (productId: string) => boolean

  // Chat actions
  addChat: (chat: Chat) => void
  addMessage: (message: ChatMessage) => void
  markChatAsRead: (chatId: string) => void
  addNotification: (title: string, message: string, type: 'referral' | 'purchase' | 'system') => void

  // Cart actions
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, variantId?: string) => void
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  getCartItemCount: () => number
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAdmin: false,
      favorites: [],
      selectedCategory: 'all',
      selectedFilter: 'all',
      searchQuery: '',
      theme: 'dark',
      language: 'ru',
      currency: 'RUB',
      sortBy: 'popular',
      chats: [],
      messages: [],
      unreadChats: 0,
      cart: [],
      cartTotal: 0,

      setUser: (user) => set({ user }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),

      toggleFavorite: (productId) => set((state) => ({
        favorites: state.favorites.includes(productId)
          ? state.favorites.filter(id => id !== productId)
          : [...state.favorites, productId]
      })),

      setSelectedCategory: (category) => set({ selectedCategory: category }),

      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark'
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
          localStorage.setItem('theme', newTheme)
        }
        return { theme: newTheme }
      }),

      setLanguage: (language) => set({ language }),

      setCurrency: (currency) => set({ currency }),

      isFavorite: (productId) => get().favorites.includes(productId),

      addChat: (chat) => set((state) => {
        const existing = state.chats.find(c => c.id === chat.id)
        if (existing) return state
        return {
          chats: [chat, ...state.chats],
          unreadChats: state.unreadChats + (chat.unread > 0 ? 1 : 0)
        }
      }),

      addMessage: (message) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === message.chatId)
        if (chatIndex === -1) return { messages: [...state.messages, message] }

        const updatedChats = [...state.chats]
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: message.text,
          lastMessageTime: message.timestamp,
          unread: updatedChats[chatIndex].unread + 1
        }

        return {
          messages: [...state.messages, message],
          chats: updatedChats,
          unreadChats: state.unreadChats + 1
        }
      }),

      markChatAsRead: (chatId) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === chatId)
        if (chatIndex === -1) return state

        const chat = state.chats[chatIndex]
        const unreadDiff = chat.unread > 0 ? 1 : 0

        const updatedChats = [...state.chats]
        updatedChats[chatIndex] = { ...chat, unread: 0 }

        return {
          chats: updatedChats,
          unreadChats: Math.max(0, state.unreadChats - unreadDiff)
        }
      }),

      addNotification: (title, message, type) => {
        const chatId = `notification-${Date.now()}`
        const notificationChat: Chat = {
          id: chatId,
          type: 'notification',
          title: title,
          avatar: type === 'referral' ? '/icons/referral.svg' : type === 'purchase' ? '/icons/purchase.svg' : '/icons/system.svg',
          lastMessage: message,
          lastMessageTime: new Date().toISOString(),
          unread: 1
        }

        const notificationMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          chatId,
          senderId: 'system',
          senderName: 'Система',
          text: message,
          timestamp: new Date().toISOString(),
          type: 'notification'
        }

        set((state) => ({
          chats: [notificationChat, ...state.chats],
          messages: [...state.messages, notificationMessage],
          unreadChats: state.unreadChats + 1
        }))
      },

      // Cart actions
      addToCart: (item) => set((state) => {
        const existingIndex = state.cart.findIndex(
          i => i.productId === item.productId && i.variantId === item.variantId
        )

        let newCart: CartItem[]
        if (existingIndex >= 0) {
          newCart = [...state.cart]
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            quantity: newCart[existingIndex].quantity + item.quantity
          }
        } else {
          newCart = [...state.cart, item]
        }

        const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0)
        return { cart: newCart, cartTotal }
      }),

      removeFromCart: (productId, variantId) => set((state) => {
        const newCart = state.cart.filter(
          i => !(i.productId === productId && i.variantId === variantId)
        )
        const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0)
        return { cart: newCart, cartTotal }
      }),

      updateCartQuantity: (productId, quantity, variantId) => set((state) => {
        if (quantity <= 0) {
          const newCart = state.cart.filter(
            i => !(i.productId === productId && i.variantId === variantId)
          )
          const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0)
          return { cart: newCart, cartTotal }
        }

        const newCart = state.cart.map(i =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        )
        const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0)
        return { cart: newCart, cartTotal }
      }),

      clearCart: () => set({ cart: [], cartTotal: 0 }),

      getCartItemCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0)
    }),
    {
      name: 'fastpay-storage',
      // SECURITY: isAdmin is NOT persisted - it must come from backend auth only
      partialize: (state) => ({
        favorites: state.favorites,
        theme: state.theme,
        language: state.language,
        currency: state.currency,
        chats: state.chats,
        messages: state.messages,
        cart: state.cart,
        cartTotal: state.cartTotal
      })
    }
  )
)
