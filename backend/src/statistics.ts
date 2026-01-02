import { getOrdersCollection, getProductsCollection, getUsersCollection, getReviewsCollection } from './database'
import { OrderStatus } from './database'

// Time periods
export type Period = '24h' | '7d' | '30d' | '90d' | '365d' | 'all'

function getPeriodStart(period: Period): Date {
  const now = new Date()
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '365d':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    case 'all':
    default:
      return new Date(0)
  }
}

// Dashboard overview stats
export interface DashboardStats {
  orders: {
    total: number
    pending: number
    paid: number
    delivered: number
    cancelled: number
    refunded: number
  }
  revenue: {
    total: number
    paid: number
    pending: number
  }
  products: {
    total: number
    inStock: number
    outOfStock: number
  }
  users: {
    total: number
    newToday: number
    newThisWeek: number
  }
  reviews: {
    total: number
    averageRating: number
  }
}

export async function getDashboardStats(period: Period = '30d'): Promise<DashboardStats> {
  const periodStart = getPeriodStart(period)
  const periodFilter = period === 'all' ? {} : { createdAt: { $gte: periodStart.toISOString() } }

  const [orders, products, users, reviews] = await Promise.all([
    getOrdersCollection().find(periodFilter).toArray(),
    getProductsCollection().find({}).toArray(),
    getUsersCollection().find({}).toArray(),
    getReviewsCollection().find(periodFilter).toArray()
  ])

  // Orders stats
  const ordersByStatus = {
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    refunded: orders.filter(o => o.status === 'refunded').length
  }

  // Revenue
  const paidOrders = orders.filter(o => ['paid', 'delivered'].includes(o.status))
  const pendingOrders = orders.filter(o => o.status === 'pending')

  // Users
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const newToday = users.filter(u => new Date(u.createdAt) >= todayStart).length
  const newThisWeek = users.filter(u => new Date(u.createdAt) >= weekStart).length

  // Reviews
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return {
    orders: {
      total: orders.length,
      pending: ordersByStatus.pending,
      paid: ordersByStatus.paid + ordersByStatus.processing,
      delivered: ordersByStatus.delivered,
      cancelled: ordersByStatus.cancelled,
      refunded: ordersByStatus.refunded
    },
    revenue: {
      total: orders.reduce((sum, o) => sum + o.amount, 0),
      paid: paidOrders.reduce((sum, o) => sum + o.amount, 0),
      pending: pendingOrders.reduce((sum, o) => sum + o.amount, 0)
    },
    products: {
      total: products.length,
      inStock: products.filter(p => p.inStock).length,
      outOfStock: products.filter(p => !p.inStock).length
    },
    users: {
      total: users.length,
      newToday,
      newThisWeek
    },
    reviews: {
      total: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10
    }
  }
}

// Revenue chart data
export interface ChartDataPoint {
  date: string
  value: number
  count?: number
}

export async function getRevenueChart(period: Period = '30d', groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
  const periodStart = getPeriodStart(period)

  const orders = await getOrdersCollection().find({
    createdAt: { $gte: periodStart.toISOString() },
    status: { $in: ['paid', 'delivered'] as OrderStatus[] }
  }).toArray()

  // Group by date
  const grouped: Record<string, { revenue: number; count: number }> = {}

  orders.forEach(order => {
    const date = new Date(order.paidAt || order.createdAt)
    let key: string

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'day':
      default:
        key = date.toISOString().split('T')[0]
    }

    if (!grouped[key]) {
      grouped[key] = { revenue: 0, count: 0 }
    }
    grouped[key].revenue += order.amount
    grouped[key].count++
  })

  // Sort by date and return
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: data.revenue,
      count: data.count
    }))
}

// Orders chart data
export async function getOrdersChart(period: Period = '30d', groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
  const periodStart = getPeriodStart(period)

  const orders = await getOrdersCollection().find({
    createdAt: { $gte: periodStart.toISOString() }
  }).toArray()

  // Group by date
  const grouped: Record<string, number> = {}

  orders.forEach(order => {
    const date = new Date(order.createdAt)
    let key: string

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'day':
      default:
        key = date.toISOString().split('T')[0]
    }

    grouped[key] = (grouped[key] || 0) + 1
  })

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      value: count
    }))
}

// Top selling products
export interface TopProduct {
  productId: string
  productName: string
  count: number
  revenue: number
}

export async function getTopProducts(period: Period = '30d', limit: number = 10): Promise<TopProduct[]> {
  const periodStart = getPeriodStart(period)

  const orders = await getOrdersCollection().find({
    createdAt: { $gte: periodStart.toISOString() },
    status: { $in: ['paid', 'delivered'] as OrderStatus[] }
  }).toArray()

  // Group by product
  const productStats: Record<string, TopProduct> = {}

  orders.forEach(order => {
    const key = order.productId
    if (!productStats[key]) {
      productStats[key] = {
        productId: order.productId,
        productName: order.productName,
        count: 0,
        revenue: 0
      }
    }
    productStats[key].count++
    productStats[key].revenue += order.amount
  })

  // Sort by revenue and limit
  return Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

// Payment method distribution
export interface PaymentMethodStats {
  method: string
  count: number
  revenue: number
  percentage: number
}

export async function getPaymentMethodStats(period: Period = '30d'): Promise<PaymentMethodStats[]> {
  const periodStart = getPeriodStart(period)

  const orders = await getOrdersCollection().find({
    createdAt: { $gte: periodStart.toISOString() },
    status: { $in: ['paid', 'delivered'] as OrderStatus[] }
  }).toArray()

  const total = orders.length || 1

  // Group by payment method
  const methodStats: Record<string, { count: number; revenue: number }> = {}

  orders.forEach(order => {
    const method = order.paymentMethod || 'unknown'
    if (!methodStats[method]) {
      methodStats[method] = { count: 0, revenue: 0 }
    }
    methodStats[method].count++
    methodStats[method].revenue += order.amount
  })

  return Object.entries(methodStats)
    .map(([method, stats]) => ({
      method,
      count: stats.count,
      revenue: stats.revenue,
      percentage: Math.round((stats.count / total) * 100)
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// User growth chart
export async function getUserGrowthChart(period: Period = '30d', groupBy: 'day' | 'week' | 'month' = 'day'): Promise<ChartDataPoint[]> {
  const periodStart = getPeriodStart(period)

  const users = await getUsersCollection().find({
    createdAt: { $gte: periodStart.toISOString() }
  }).toArray()

  // Group by date
  const grouped: Record<string, number> = {}

  users.forEach(user => {
    const date = new Date(user.createdAt)
    let key: string

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'day':
      default:
        key = date.toISOString().split('T')[0]
    }

    grouped[key] = (grouped[key] || 0) + 1
  })

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      value: count
    }))
}

// Category distribution
export interface CategoryStats {
  category: string
  productCount: number
  orderCount: number
  revenue: number
}

export async function getCategoryStats(period: Period = '30d'): Promise<CategoryStats[]> {
  const periodStart = getPeriodStart(period)

  const [products, orders] = await Promise.all([
    getProductsCollection().find({}).toArray(),
    getOrdersCollection().find({
      createdAt: { $gte: periodStart.toISOString() },
      status: { $in: ['paid', 'delivered'] as OrderStatus[] }
    }).toArray()
  ])

  // Map product IDs to categories
  const productCategories: Record<string, string> = {}
  const categoryProductCount: Record<string, number> = {}

  products.forEach(p => {
    const id = p._id?.toString() || ''
    productCategories[id] = p.category || 'Другое'
    categoryProductCount[p.category || 'Другое'] = (categoryProductCount[p.category || 'Другое'] || 0) + 1
  })

  // Calculate order stats by category
  const categoryOrderStats: Record<string, { count: number; revenue: number }> = {}

  orders.forEach(order => {
    const category = productCategories[order.productId] || 'Другое'
    if (!categoryOrderStats[category]) {
      categoryOrderStats[category] = { count: 0, revenue: 0 }
    }
    categoryOrderStats[category].count++
    categoryOrderStats[category].revenue += order.amount
  })

  // Combine
  const allCategories = new Set([
    ...Object.keys(categoryProductCount),
    ...Object.keys(categoryOrderStats)
  ])

  return Array.from(allCategories).map(category => ({
    category,
    productCount: categoryProductCount[category] || 0,
    orderCount: categoryOrderStats[category]?.count || 0,
    revenue: categoryOrderStats[category]?.revenue || 0
  })).sort((a, b) => b.revenue - a.revenue)
}

console.log('[Statistics] Module loaded')
