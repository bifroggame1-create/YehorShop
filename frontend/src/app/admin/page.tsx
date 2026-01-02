'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Product, ProductVariant } from '@/types'
import { productsApi, adminApi, sellerApplicationsApi } from '@/lib/api'
import { initAuth, isAdmin as checkIsAdmin, getUser } from '@/lib/auth'

type Tab = 'dashboard' | 'orders' | 'products' | 'sellers' | 'reviews' | 'promo' | 'files' | 'admins' | 'applications' | 'users'

interface SellerApplication {
  id: string
  shopName: string
  category: string
  description: string
  telegram: string
  userId?: string
  userName?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
  reviewNote?: string
}

interface Admin {
  id: string
  oderId?: string
  userId?: string
  username?: string
  name?: string
  addedAt: string
  addedBy?: string
}

type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'

interface Order {
  id: string
  oderId: string
  userId: string
  userName?: string
  userUsername?: string
  productId: string
  productName: string
  variantId?: string
  variantName?: string
  amount: number
  paymentMethod: 'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'
  paymentId?: string
  status: OrderStatus
  deliveryData?: string
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

type SellerBadge = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky'

interface Seller {
  id: string
  name: string
  avatar: string
  rating: number
  isVerified?: boolean
  isBlocked?: boolean
  blockReason?: string
  badges?: SellerBadge[]
}

interface UserProfile {
  id: string
  oderId?: string
  telegramId: string
  username?: string
  firstName?: string
  lastName?: string
  isBlocked?: boolean
  blockReason?: string
  isPremium?: boolean
  ordersCount?: number
  totalSpent?: number
  createdAt?: string
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  text: string
  date: string
}

interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxUses: number
  usedCount: number
  isActive: boolean
  description: string
  expiresAt?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  data: string
  uploadedAt: string
}

// Icons
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  sellers: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  reviews: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  promo: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  files: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  admins: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  applications: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  notification: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sellers state
  const [sellers, setSellers] = useState<Seller[]>([])
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)

  // Admins state
  const [admins, setAdmins] = useState<Admin[]>([])
  const [newAdminInput, setNewAdminInput] = useState('')
  const [newAdminName, setNewAdminName] = useState('')

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  // Promo state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)

  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null)
  const [ordersStats, setOrdersStats] = useState<any>(null)

  // Seller Applications state
  const [applications, setApplications] = useState<SellerApplication[]>([])

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([])
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      const authUser = await initAuth()
      const hasAccess = authUser?.isAdmin || checkIsAdmin()
      setIsAdmin(hasAccess)

      if (hasAccess) {
        loadData()
      } else {
        setLoading(false)
      }
    }

    checkAccessAndLoad()
  }, [user])

  const loadData = async () => {
    try {
      const [productsData, promoData, ordersData, statsData, sellersData, adminsData, filesData, reviewsData, applicationsData, usersData] = await Promise.all([
        productsApi.getAll({}),
        adminApi.getPromoCodes().catch(() => []),
        adminApi.getOrders().catch(() => ({ orders: [], total: 0 })),
        adminApi.getOrdersStats().catch(() => ({ stats: {} })),
        adminApi.getSellers().catch(() => []),
        adminApi.getAdmins().catch(() => []),
        adminApi.getFiles().catch(() => ({ files: [] })),
        adminApi.getReviews().catch(() => ({ reviews: [] })),
        sellerApplicationsApi.getAll().catch(() => ({ applications: [] })),
        adminApi.getUsers().catch(() => ({ users: [] }))
      ])
      setProducts(productsData)
      setPromoCodes(promoData?.promoCodes || promoData || [])
      setOrders(ordersData.orders || [])
      setOrdersStats(statsData.stats || {})
      setSellers(sellersData?.sellers || sellersData || [])
      setAdmins(adminsData?.admins || adminsData || [])
      setUploadedFiles(filesData?.files || [])
      setReviews(reviewsData?.reviews || [])
      setApplications(applicationsData?.applications || [])
      setUsers(usersData?.users || [])
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false)
    }
  }

  // All handlers (kept from original)
  const handleSaveProduct = async (product: Product) => {
    try {
      if (isAddingNew) {
        const result = await adminApi.createProduct(product)
        if (result.success) {
          setProducts([result.product, ...products])
          alert('Товар успешно создан!')
        }
      } else {
        const result = await adminApi.updateProduct(product._id, product)
        if (result.success) {
          setProducts(products.map(p => p._id === product._id ? result.product : p))
          alert('Товар успешно обновлён!')
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Ошибка сохранения товара: ' + (error as any).message)
    }
    setEditingProduct(null)
    setIsAddingNew(false)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Удалить товар?')) {
      try {
        const result = await adminApi.deleteProduct(productId)
        if (result.success) {
          setProducts(products.filter(p => p._id !== productId))
        }
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  const handleSaveSeller = async (seller: Seller) => {
    try {
      const existingSeller = sellers.find(s => s.id === seller.id)
      if (existingSeller) {
        const result = await adminApi.updateSeller(seller.id, seller)
        if (result.success) {
          const sellersData = await adminApi.getSellers()
          setSellers(sellersData?.sellers || [])
        }
      } else {
        const result = await adminApi.createSeller(seller)
        if (result.success) {
          const sellersData = await adminApi.getSellers()
          setSellers(sellersData?.sellers || [])
        }
      }
      setEditingSeller(null)
      const productsData = await productsApi.getAll({})
      setProducts(productsData)
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSaveUser = async (user: UserProfile) => {
    try {
      await adminApi.updateUser(user.id, user)
      setUsers(users.map(u => u.id === user.id ? user : u))
      setEditingUser(null)
    } catch (error: any) {
      alert(error.response?.data?.error || error.message)
    }
  }

  const handleDeleteSeller = async (sellerId: string) => {
    if (!confirm('Удалить продавца?')) return
    try {
      await adminApi.deleteSeller(sellerId)
      setSellers(sellers.filter(s => s.id !== sellerId))
    } catch (error) {
      console.error('Error deleting seller:', error)
    }
  }

  const handleAddAdmin = async () => {
    const input = newAdminInput.trim()
    if (!input) return

    try {
      const isUsername = input.startsWith('@')
      const result = await adminApi.addAdmin({
        userId: isUsername ? undefined : input,
        username: isUsername ? input.substring(1) : undefined,
        name: newAdminName.trim() || undefined
      })

      if (result.success) {
        setAdmins([...admins, result.admin])
        setNewAdminInput('')
        setNewAdminName('')
      }
    } catch (error: any) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Удалить админа?')) return
    try {
      await adminApi.removeAdmin(adminId)
      setAdmins(admins.filter(a => a.id !== adminId))
    } catch (error) {
      console.error('Error removing admin:', error)
    }
  }

  const handleSaveReview = async (review: Review) => {
    try {
      if (reviews.find(r => r.id === review.id)) {
        const result = await adminApi.updateReview(review.id, {
          userName: review.userName,
          rating: review.rating,
          text: review.text
        })
        if (result.success) {
          setReviews(reviews.map(r => r.id === review.id ? result.review : r))
        }
      } else {
        const result = await adminApi.createReview({
          productId: review.productId,
          userName: review.userName,
          rating: review.rating,
          text: review.text
        })
        if (result.success) {
          setReviews([result.review, ...reviews])
        }
      }
      setEditingReview(null)
    } catch (error) {
      console.error('Error saving review:', error)
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Удалить отзыв?')) return
    try {
      const result = await adminApi.deleteReview(reviewId)
      if (result.success) {
        setReviews(reviews.filter(r => r.id !== reviewId))
      }
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const handleSavePromo = async (promo: PromoCode) => {
    try {
      const existingPromo = promoCodes.find(p => p.code === promo.code)
      if (existingPromo) {
        await adminApi.updatePromoCode(promo.code, promo)
        setPromoCodes(promoCodes.map(p => p.code === promo.code ? promo : p))
      } else {
        await adminApi.createPromoCode(promo)
        setPromoCodes([...promoCodes, promo])
      }
      setEditingPromo(null)
    } catch (error) {
      console.error('Error saving promo:', error)
    }
  }

  const handleDeletePromo = async (code: string) => {
    if (confirm('Удалить промокод?')) {
      try {
        await adminApi.deletePromoCode(code)
        setPromoCodes(promoCodes.filter(p => p.code !== code))
      } catch (error) {
        console.error('Error deleting promo:', error)
      }
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой. Максимум 5MB`)
        continue
      }

      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const result = await adminApi.uploadFile({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string
          })
          if (result.success) {
            setUploadedFiles(prev => [result.file, ...prev])
          }
        } catch (error) {
          console.error('Error uploading file:', error)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Удалить файл?')) return
    try {
      const result = await adminApi.deleteFile(fileId)
      if (result.success) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDeliverOrder = async (orderId: string, deliveryData: string, deliveryNote?: string) => {
    try {
      const result = await adminApi.deliverOrder(orderId, deliveryData, deliveryNote)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
        setDeliveringOrder(null)
      }
    } catch (error) {
      console.error('Error delivering order:', error)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Отменить заказ?')) return
    try {
      const result = await adminApi.cancelOrder(orderId)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
    }
  }

  const handleRefundOrder = async (orderId: string) => {
    if (!confirm('Вернуть деньги за заказ?')) return
    try {
      const result = await adminApi.refundOrder(orderId)
      if (result.success) {
        setOrders(orders.map(o => o.id === orderId ? result.order : o))
      }
    } catch (error) {
      console.error('Error refunding order:', error)
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { label: string; class: string }> = {
      pending: { label: 'Ожидает', class: 'bg-amber-500/10 text-amber-500' },
      paid: { label: 'Оплачен', class: 'bg-emerald-500/10 text-emerald-500' },
      processing: { label: 'В работе', class: 'bg-blue-500/10 text-blue-500' },
      delivered: { label: 'Выдан', class: 'bg-cyan-500/10 text-cyan-500' },
      cancelled: { label: 'Отменён', class: 'bg-red-500/10 text-red-500' },
      refunded: { label: 'Возврат', class: 'bg-gray-500/10 text-gray-400' }
    }
    return config[status]
  }

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      'cryptobot': 'CryptoBot',
      'cactuspay-sbp': 'СБП',
      'cactuspay-card': 'Карта'
    }
    return labels[method] || method
  }

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: Icons.dashboard },
    { id: 'orders', label: 'Заказы', icon: Icons.orders, count: orders.filter(o => o.status === 'paid').length },
    { id: 'applications', label: 'Заявки', icon: Icons.applications, count: applications.filter(a => a.status === 'pending').length, highlight: true },
    { id: 'products', label: 'Товары', icon: Icons.products, count: products.length },
    { id: 'sellers', label: 'Продавцы', icon: Icons.sellers, count: sellers.length },
    { id: 'users', label: 'Юзеры', icon: Icons.users, count: users.length },
    { id: 'reviews', label: 'Отзывы', icon: Icons.reviews, count: reviews.length },
    { id: 'promo', label: 'Промокоды', icon: Icons.promo, count: promoCodes.length },
    { id: 'admins', label: 'Админы', icon: Icons.admins, count: admins.length },
    { id: 'files', label: 'Файлы', icon: Icons.files, count: uploadedFiles.length },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="bg-[#1a1d27] rounded-lg p-8 text-center max-w-sm border border-[#2a2d37]">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Доступ запрещён</h1>
          <p className="text-gray-400 text-sm mb-6">У вас нет прав для просмотра этой страницы</p>
          <button onClick={() => router.push('/')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${sidebarCollapsed ? 'md:w-16' : 'md:w-56'} w-64
        bg-[#0f1117] border-r border-[#1e2028] flex flex-col transition-all duration-200
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#1e2028]">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FP</span>
            </div>
            {(!sidebarCollapsed || mobileMenuOpen) && <span className="ml-3 font-semibold text-white">Yehor Shop</span>}
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as Tab); setMobileMenuOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600/10 text-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27]'
              }`}
            >
              {item.icon}
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.highlight && activeTab !== item.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#2a2d37] text-gray-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-[#1e2028]">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-[#1a1d27] transition-colors"
          >
            {Icons.logout}
            {(!sidebarCollapsed || mobileMenuOpen) && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen w-full md:w-auto">
        {/* Top bar */}
        <header className="h-14 bg-[#0f1117] border-b border-[#1e2028] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => {
                // Mobile: toggle mobile menu, Desktop: toggle sidebar collapse
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
                if (isMobile) {
                  setMobileMenuOpen(prev => !prev)
                } else {
                  setSidebarCollapsed(prev => !prev)
                }
              }}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1d27] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="relative hidden sm:block">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-48 md:w-64 pl-9 pr-4 py-2 bg-[#1a1d27] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {Icons.search}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1d27] transition-colors relative">
              {Icons.notification}
              {applications.filter(a => a.status === 'pending').length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>
            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1d27] transition-colors hidden sm:block">
              {Icons.settings}
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">A</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-xl font-semibold text-white">Dashboard</h1>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">Всего заказов</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{orders.length}</span>
                    <span className="text-xs text-emerald-500">+{ordersStats?.todayOrders || 0} сегодня</span>
                  </div>
                </div>

                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">Выдано</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{ordersStats?.delivered || 0}</span>
                    <span className="text-xs text-emerald-500">+3%</span>
                  </div>
                </div>

                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">Отменено</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{ordersStats?.cancelled || 0}</span>
                    <span className="text-xs text-red-500">-2%</span>
                  </div>
                </div>

                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">Выручка</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{((ordersStats?.totalRevenue || 0) / 1000).toFixed(1)}k ₽</span>
                    <span className="text-xs text-emerald-500">+12%</span>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="px-4 py-3 border-b border-[#2a2d37] flex items-center justify-between">
                  <h2 className="font-medium text-white">Последние заказы</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-sm text-blue-500 hover:text-blue-400">
                    Все заказы →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Покупатель</th>
                        <th className="px-4 py-3 font-medium">Заказ</th>
                        <th className="px-4 py-3 font-medium">Сумма</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(order => {
                        const badge = getStatusBadge(order.status)
                        return (
                          <tr key={order.id} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">
                                  {(order.userName || order.userUsername || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-white">{order.userName || order.userUsername || order.userId}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-300">{order.productName}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-white font-medium">{order.amount.toLocaleString()} ₽</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${badge.class}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Товары</h3>
                  <div className="text-2xl font-bold text-white mb-1">{products.length}</div>
                  <p className="text-xs text-gray-500">активных позиций</p>
                </div>
                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Продавцы</h3>
                  <div className="text-2xl font-bold text-white mb-1">{sellers.length}</div>
                  <p className="text-xs text-gray-500">зарегистрировано</p>
                </div>
                <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Пользователи</h3>
                  <div className="text-2xl font-bold text-white mb-1">{users.length}</div>
                  <p className="text-xs text-gray-500">в базе</p>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">Заказы</h1>
              </div>

              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Покупатель</th>
                        <th className="px-4 py-3 font-medium">Товар</th>
                        <th className="px-4 py-3 font-medium">Сумма</th>
                        <th className="px-4 py-3 font-medium">Оплата</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Дата</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const badge = getStatusBadge(order.status)
                        return (
                          <tr key={order.id} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">
                                  {(order.userName || order.userUsername || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm text-white">{order.userName || order.userUsername || 'Аноним'}</div>
                                  <div className="text-xs text-gray-500">{order.userId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-300">{order.productName}</div>
                              {order.variantName && <div className="text-xs text-gray-500">{order.variantName}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-white font-medium">{order.amount.toLocaleString()} ₽</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-400">{getPaymentLabel(order.paymentMethod)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${badge.class}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {order.status === 'paid' && (
                                  <>
                                    <button
                                      onClick={() => setDeliveringOrder(order)}
                                      className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500/20 transition-colors"
                                    >
                                      Выдать
                                    </button>
                                    <button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                                    >
                                      Отмена
                                    </button>
                                  </>
                                )}
                                {order.status === 'delivered' && (
                                  <button
                                    onClick={() => handleRefundOrder(order.id)}
                                    className="text-xs px-2 py-1 bg-gray-500/10 text-gray-400 rounded hover:bg-gray-500/20 transition-colors"
                                  >
                                    Возврат
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Заявки продавцов</h1>

              {applications.filter(a => a.status === 'pending').length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-amber-500">Ожидают рассмотрения</h2>
                  {applications.filter(a => a.status === 'pending').map(app => (
                    <div key={app.id} className="bg-[#1a1d27] rounded-lg p-4 border border-amber-500/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{app.shopName}</h3>
                          <p className="text-sm text-blue-400">{app.category}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full">Новая</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{app.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <a href={`https://t.me/${app.telegram.replace('@', '')}`} target="_blank" className="text-blue-400 hover:underline">{app.telegram}</a>
                        <span>{new Date(app.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (confirm('Одобрить заявку?')) {
                              await sellerApplicationsApi.updateStatus(app.id, { status: 'approved' })
                              setApplications(applications.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={async () => {
                            const reason = prompt('Причина отклонения:')
                            await sellerApplicationsApi.updateStatus(app.id, { status: 'rejected', reviewNote: reason || undefined })
                            setApplications(applications.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {applications.filter(a => a.status !== 'pending').length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-gray-500">Обработанные</h2>
                  {applications.filter(a => a.status !== 'pending').map(app => (
                    <div key={app.id} className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37] opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">{app.shopName}</h3>
                          <p className="text-xs text-gray-500">{app.telegram}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {app.status === 'approved' ? 'Одобрена' : 'Отклонена'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">Товары</h1>
                <button
                  onClick={() => {
                    setIsAddingNew(true)
                    setEditingProduct({
                      _id: '',
                      name: '',
                      price: 0,
                      images: ['/products/placeholder.png'],
                      condition: 'new',
                      category: 'ai-subscriptions',
                      seller: sellers[0],
                      rating: 5.0,
                      description: '',
                      inStock: true,
                      createdAt: new Date().toISOString(),
                      variants: []
                    })
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  + Добавить товар
                </button>
              </div>

              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Товар</th>
                        <th className="px-4 py-3 font-medium">Категория</th>
                        <th className="px-4 py-3 font-medium">Цена</th>
                        <th className="px-4 py-3 font-medium">Варианты</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => (
                        <tr key={product._id} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                              <span className="text-sm text-white">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{product.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white font-medium">{product.price.toLocaleString()} ₽</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{product.variants?.length || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setIsAddingNew(false)
                                  setEditingProduct(product)
                                }}
                                className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                              >
                                Изменить
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sellers Tab */}
          {activeTab === 'sellers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">Продавцы</h1>
                <button
                  onClick={() => setEditingSeller({ id: '', name: '', avatar: '', rating: 5.0, isVerified: false })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  + Добавить продавца
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {sellers.map(seller => (
                  <div key={seller.id} className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={seller.avatar || '/default-avatar.png'} alt={seller.name} className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{seller.name}</span>
                          {seller.isVerified && <span className="text-blue-500">✓</span>}
                        </div>
                        <div className="text-xs text-gray-500">ID: {seller.id}</div>
                      </div>
                      <div className="text-sm text-amber-400">★ {seller.rating}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSeller(seller)}
                        className="flex-1 text-xs px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeleteSeller(seller.id)}
                        className="text-xs px-3 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Пользователи</h1>

              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Пользователь</th>
                        <th className="px-4 py-3 font-medium">Telegram ID</th>
                        <th className="px-4 py-3 font-medium">Заказов</th>
                        <th className="px-4 py-3 font-medium">Потрачено</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-xs text-blue-400">
                                {(u.firstName || u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm text-white">{u.firstName} {u.lastName || ''}</div>
                                {u.username && <div className="text-xs text-gray-500">@{u.username}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400 font-mono">{u.telegramId}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white">{u.ordersCount || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white">{(u.totalSpent || 0).toFixed(0)} ₽</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {u.isPremium && <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded">Premium</span>}
                              {u.isBlocked && <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded">Заблокирован</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                            >
                              Редактировать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">Отзывы</h1>
                <button
                  onClick={() => setEditingReview({
                    id: '',
                    productId: products[0]?._id || '',
                    userId: '',
                    userName: '',
                    rating: 5,
                    text: '',
                    date: new Date().toISOString()
                  })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  + Добавить отзыв
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-sm text-white">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{review.userName}</div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`text-sm ${star <= review.rating ? 'text-amber-400' : 'text-gray-600'}`}>★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{review.text}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promo Tab */}
          {activeTab === 'promo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">Промокоды</h1>
                <button
                  onClick={() => setEditingPromo({
                    code: '',
                    discountType: 'percentage',
                    discountValue: 10,
                    minOrderAmount: 0,
                    maxUses: 100,
                    usedCount: 0,
                    isActive: true,
                    description: ''
                  })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  + Добавить промокод
                </button>
              </div>

              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Код</th>
                        <th className="px-4 py-3 font-medium">Скидка</th>
                        <th className="px-4 py-3 font-medium">Использовано</th>
                        <th className="px-4 py-3 font-medium">Статус</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoCodes.map(promo => (
                        <tr key={promo.code} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-blue-400">{promo.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white">
                              {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue} ₽`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{promo.usedCount}/{promo.maxUses}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${promo.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'}`}>
                              {promo.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPromo(promo)}
                                className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                              >
                                Изменить
                              </button>
                              <button
                                onClick={() => handleDeletePromo(promo.code)}
                                className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Admins Tab */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Админы</h1>

              <div className="bg-[#1a1d27] rounded-lg p-4 border border-[#2a2d37]">
                <h3 className="font-medium text-white mb-3">Добавить админа</h3>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newAdminInput}
                    onChange={e => setNewAdminInput(e.target.value)}
                    placeholder="User ID или @username"
                    className="px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    placeholder="Имя (опционально)"
                    className="px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={handleAddAdmin}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="bg-[#1a1d27] rounded-lg border border-[#2a2d37]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-[#2a2d37]">
                        <th className="px-4 py-3 font-medium">Админ</th>
                        <th className="px-4 py-3 font-medium">ID / Username</th>
                        <th className="px-4 py-3 font-medium">Добавлен</th>
                        <th className="px-4 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map(admin => (
                        <tr key={admin.id} className="border-b border-[#2a2d37] last:border-0 hover:bg-[#1e2028]">
                          <td className="px-4 py-3">
                            <span className="text-sm text-white">{admin.name || 'Без имени'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-400">
                              {admin.userId && <span>ID: {admin.userId}</span>}
                              {admin.userId && admin.username && <span> • </span>}
                              {admin.username && <span>@{admin.username}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{new Date(admin.addedAt).toLocaleDateString('ru-RU')}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveAdmin(admin.id)}
                              className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-white">Файлы</h1>

              <FileUploader onUpload={handleFileUpload} />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="bg-[#1a1d27] rounded-lg border border-[#2a2d37] overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img src={file.data} alt={file.name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-[#0f1117]">
                        <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs text-white truncate mb-1">{file.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{(file.size / 1024).toFixed(1)} KB</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(file.data)}
                          className="flex-1 text-xs py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
                        >
                          Копировать
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors text-xs"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          sellers={sellers}
          uploadedFiles={uploadedFiles}
          onSave={handleSaveProduct}
          onClose={() => { setEditingProduct(null); setIsAddingNew(false) }}
          isNew={isAddingNew}
        />
      )}

      {editingSeller && (
        <SellerEditor
          seller={editingSeller}
          uploadedFiles={uploadedFiles}
          onSave={handleSaveSeller}
          onClose={() => setEditingSeller(null)}
          isNew={!editingSeller.id}
        />
      )}

      {editingUser && (
        <UserEditor
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {editingReview && (
        <ReviewEditor
          review={editingReview}
          products={products}
          onSave={handleSaveReview}
          onClose={() => setEditingReview(null)}
        />
      )}

      {editingPromo && (
        <PromoEditor
          promo={editingPromo}
          onSave={handleSavePromo}
          onClose={() => setEditingPromo(null)}
        />
      )}

      {deliveringOrder && (
        <OrderDeliveryEditor
          order={deliveringOrder}
          onDeliver={handleDeliverOrder}
          onClose={() => setDeliveringOrder(null)}
        />
      )}
    </div>
  )
}

// File Uploader Component
function FileUploader({ onUpload }: { onUpload: (files: FileList | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="w-full py-8 border border-dashed border-[#2a2d37] rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-colors bg-[#1a1d27]"
    >
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-400">Нажмите для загрузки</p>
      <p className="text-xs text-gray-500">Изображения, TXT, PDF (max 5MB)</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.pdf,.json"
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}

// Product Editor Modal
function ProductEditor({
  product,
  sellers,
  uploadedFiles,
  onSave,
  onClose,
  isNew
}: {
  product: Product
  sellers: Seller[]
  uploadedFiles: UploadedFile[]
  onSave: (product: Product) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState({ ...product, price: product.price || 0 })
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants || [])
  const [showFilePicker, setShowFilePicker] = useState(false)

  const handleAddVariant = () => {
    setVariants([...variants, { id: `var-${Date.now()}`, name: '', price: 0, period: '', features: [] }])
  }

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants]
    if (field === 'features') {
      updated[index] = { ...updated[index], features: value.split(',').map((f: string) => f.trim()).filter(Boolean) }
    } else if (field === 'price') {
      updated[index] = { ...updated[index], price: parseInt(value) || 0 }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setVariants(updated)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    const finalPrice = variants.length > 0 ? variants[0].price : form.price
    onSave({ ...form, price: finalPrice, variants: variants.filter(v => v.name.trim()) })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-2xl max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="sticky top-0 bg-[#1a1d27] px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">{isNew ? 'Новый товар' : 'Редактирование'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <img src={form.images[0] || '/products/placeholder.png'} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Изображение</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.images[0]}
                  onChange={e => setForm({...form, images: [e.target.value]})}
                  placeholder="/brands/example.webp"
                  className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white"
                />
                <button onClick={() => setShowFilePicker(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Выбрать
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Категория</label>
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              >
                <option value="ai-subscriptions">AI Подписки</option>
                <option value="vpn">VLESS + Shadowsocks</option>
                <option value="streaming">Стриминг</option>
                <option value="gaming">Игры</option>
                <option value="software">Софт</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Продавец</label>
              <select
                value={form.seller?.id}
                onChange={e => {
                  const seller = sellers.find(s => s.id === e.target.value)
                  if (seller) setForm({...form, seller})
                }}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              >
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {variants.length === 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Варианты</label>
              <button onClick={handleAddVariant} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">+ Добавить</button>
            </div>
            {variants.map((variant, index) => (
              <div key={variant.id} className="bg-[#0f1117] rounded-lg p-3 mb-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Вариант {index + 1}</span>
                  <button onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="text-xs text-red-500">Удалить</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={variant.name}
                    onChange={e => handleUpdateVariant(index, 'name', e.target.value)}
                    placeholder="Название"
                    className="px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white"
                  />
                  <input
                    type="number"
                    value={variant.price}
                    onChange={e => handleUpdateVariant(index, 'price', e.target.value)}
                    placeholder="Цена"
                    className="px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d37] rounded text-sm text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>

        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#1a1d27] rounded-lg p-4 w-full max-w-md border border-[#2a2d37]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-white">Выбрать изображение</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { name: 'Claude', url: '/brands/claude.webp' },
                  { name: 'OpenAI', url: '/brands/openai.webp' },
                  { name: 'Gemini', url: '/brands/gemini.webp' },
                  { name: 'Perplexity', url: '/brands/perp.webp' },
                  { name: 'Adobe', url: '/brands/adobe.webp' },
                  { name: 'Spotify', url: '/brands/spotify.webp' },
                  { name: 'Steam', url: '/brands/steam.webp' },
                  { name: 'Xbox', url: '/brands/xbox.webp' },
                ].map(brand => (
                  <button
                    key={brand.url}
                    onClick={() => { setForm({...form, images: [brand.url]}); setShowFilePicker(false) }}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500"
                  >
                    <img src={brand.url} alt={brand.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              {uploadedFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                    <button
                      key={file.id}
                      onClick={() => { setForm({...form, images: [file.data]}); setShowFilePicker(false) }}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500"
                    >
                      <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Seller Editor Modal
function SellerEditor({
  seller,
  uploadedFiles,
  onSave,
  onClose,
  isNew
}: {
  seller: Seller
  uploadedFiles: UploadedFile[]
  onSave: (seller: Seller) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState(seller)
  const [showFilePicker, setShowFilePicker] = useState(false)

  const selectImage = (url: string) => {
    setForm({ ...form, avatar: url })
    setShowFilePicker(false)
  }

  const badgeOptions: { id: SellerBadge; label: string; color: string }[] = [
    { id: 'new', label: '🆕 Новичок', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'trusted', label: '⭐ Надёжный', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { id: 'verified', label: '✓ Проверен', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'top_seller', label: '🏆 Топ продавец', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'high_volume', label: '📈 Большой объём', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'risky', label: '⚠️ Рискованный', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="sticky top-0 bg-[#1a1d27] px-4 md:px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">{isNew ? 'Новый продавец' : 'Редактирование'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img src={form.avatar || '/default-avatar.png'} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
            <button
              onClick={() => setShowFilePicker(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              Изменить аватар
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">ID</label>
            <input
              type="text"
              value={form.id}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="Telegram ID"
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Рейтинг</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={e => setForm({...form, rating: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          {/* Status checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isVerified || false}
                onChange={e => setForm({...form, isVerified: e.target.checked})}
                className="w-4 h-4 rounded accent-green-500"
              />
              ✅ Верифицированный продавец
            </label>
            <label className="flex items-center gap-2 text-sm text-red-400">
              <input
                type="checkbox"
                checked={form.isBlocked || false}
                onChange={e => setForm({...form, isBlocked: e.target.checked})}
                className="w-4 h-4 rounded accent-red-500"
              />
              🚫 Заблокирован
            </label>
          </div>

          {form.isBlocked && (
            <div>
              <label className="block text-sm text-red-400 mb-1">Причина блокировки</label>
              <input
                type="text"
                value={form.blockReason || ''}
                onChange={e => setForm({...form, blockReason: e.target.value})}
                placeholder="Укажите причину блокировки"
                className="w-full px-3 py-2 bg-red-900/20 border border-red-800 rounded-lg text-white"
              />
            </div>
          )}

          {/* Badges */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Бейджи</label>
            <div className="flex flex-wrap gap-2">
              {badgeOptions.map(badge => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => {
                    const currentBadges = form.badges || []
                    const newBadges = currentBadges.includes(badge.id)
                      ? currentBadges.filter(b => b !== badge.id)
                      : [...currentBadges, badge.id]
                    setForm({...form, badges: newBadges})
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    (form.badges || []).includes(badge.id)
                      ? badge.color + ' ring-2 ring-offset-1 ring-offset-[#1a1d27] ring-blue-500'
                      : 'bg-[#0f1117] text-gray-500 border-[#2a2d37]'
                  }`}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>

        {/* File Picker */}
        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#1a1d27] rounded-lg p-4 w-full max-w-sm border border-[#2a2d37]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-white">Выберите аватар</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={form.avatar}
                  onChange={e => setForm({...form, avatar: e.target.value})}
                  placeholder="Или введите URL"
                  className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-sm text-white"
                />
              </div>
              {uploadedFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                    <button
                      key={file.id}
                      onClick={() => selectImage(file.data)}
                      className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500"
                    >
                      <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowFilePicker(false)}
                className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// User Editor Modal
function UserEditor({
  user,
  onSave,
  onClose
}: {
  user: UserProfile
  onSave: (user: UserProfile) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(user)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Редактирование пользователя</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#0f1117] p-3 rounded-lg text-sm text-gray-400">
            <p><strong className="text-white">ID:</strong> {form.telegramId}</p>
            {form.username && <p><strong className="text-white">Username:</strong> @{form.username}</p>}
            <p><strong className="text-white">Имя:</strong> {form.firstName} {form.lastName || ''}</p>
          </div>

          <label className="flex items-center gap-2 text-sm text-amber-400">
            <input
              type="checkbox"
              checked={form.isPremium || false}
              onChange={e => setForm({...form, isPremium: e.target.checked})}
              className="rounded"
            />
            Premium пользователь
          </label>

          <label className="flex items-center gap-2 text-sm text-red-400">
            <input
              type="checkbox"
              checked={form.isBlocked || false}
              onChange={e => setForm({...form, isBlocked: e.target.checked})}
              className="rounded"
            />
            Заблокирован
          </label>

          {form.isBlocked && (
            <input
              type="text"
              value={form.blockReason || ''}
              onChange={e => setForm({...form, blockReason: e.target.value})}
              placeholder="Причина блокировки"
              className="w-full px-3 py-2 bg-red-900/20 border border-red-800 rounded-lg text-white"
            />
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Review Editor Modal
function ReviewEditor({
  review,
  products,
  onSave,
  onClose
}: {
  review: Review
  products: Product[]
  onSave: (review: Review) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(review)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Редактирование отзыва</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Товар</label>
            <select
              value={form.productId}
              onChange={e => setForm({...form, productId: e.target.value})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            >
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Имя пользователя</label>
            <input
              type="text"
              value={form.userName}
              onChange={e => setForm({...form, userName: e.target.value})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Рейтинг</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => setForm({...form, rating: star})}
                  className={`text-2xl ${star <= form.rating ? 'text-amber-400' : 'text-gray-600'}`}
                >★</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Текст</label>
            <textarea
              value={form.text}
              onChange={e => setForm({...form, text: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Promo Editor Modal
function PromoEditor({
  promo,
  onSave,
  onClose
}: {
  promo: PromoCode
  onSave: (promo: PromoCode) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(promo)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Промокод</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Код</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Тип</label>
              <select
                value={form.discountType}
                onChange={e => setForm({...form, discountType: e.target.value as 'percentage' | 'fixed'})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Скидка</label>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => setForm({...form, discountValue: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Мин. сумма</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => setForm({...form, minOrderAmount: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Макс. использований</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => setForm({...form, maxUses: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({...form, isActive: e.target.checked})}
              className="rounded"
            />
            Активен
          </label>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Order Delivery Modal
function OrderDeliveryEditor({
  order,
  onDeliver,
  onClose
}: {
  order: Order
  onDeliver: (orderId: string, deliveryData: string, deliveryNote?: string) => void
  onClose: () => void
}) {
  const [deliveryData, setDeliveryData] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="bg-[#1a1d27] rounded-t-2xl md:rounded-lg w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-[#2a2d37]">
        <div className="px-6 py-4 border-b border-[#2a2d37] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Выдача товара</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#0f1117] p-3 rounded-lg">
            <h3 className="font-medium text-white">{order.productName}</h3>
            {order.variantName && <p className="text-sm text-gray-400">{order.variantName}</p>}
            <p className="text-sm text-gray-500 mt-1">Покупатель: {order.userName || order.userId}</p>
            <p className="text-sm text-blue-400 mt-1">{order.amount.toLocaleString()} ₽</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Данные для выдачи *</label>
            <textarea
              value={deliveryData}
              onChange={e => setDeliveryData(e.target.value)}
              placeholder="Ключ, ссылка, логин:пароль..."
              rows={4}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Заметка (опционально)</label>
            <input
              type="text"
              value={deliveryNote}
              onChange={e => setDeliveryNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d37] rounded-lg text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">Отмена</button>
            <button
              onClick={() => { if (deliveryData.trim()) onDeliver(order.id, deliveryData.trim(), deliveryNote.trim() || undefined) }}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Выдать товар
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
