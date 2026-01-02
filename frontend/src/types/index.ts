export interface ProductVariant {
  id: string
  name: string
  price: number
  description?: string
  period?: string // например "1 месяц", "3 месяца"
  features?: string[] // дополнительные особенности
}

export interface Product {
  _id: string
  name: string
  price: number
  oldPrice?: number // старая цена для скидок
  images: string[]
  condition: 'new' | 'used'
  category: string
  seller: Seller
  rating: number
  reviewsCount?: number
  salesCount?: number // количество продаж
  createdAt: string
  description?: string
  inStock: boolean
  variants?: ProductVariant[] // варианты услуги
  badges?: ('sale' | 'hit' | 'new')[] // бейджи товара
  tags?: string[] // теги товара (массив ID тегов)
}

// Tag for product categorization
export interface Tag {
  _id?: string
  id: string
  name: string
  color?: string // hex color for display
  createdAt: string
  productCount?: number // computed field
}

export interface Seller {
  id: string
  name: string
  avatar?: string
  rating: number
}

// Extended seller profile from marketplace API
export type SellerBadge = 'new' | 'trusted' | 'verified' | 'top_seller' | 'high_volume' | 'risky'

export interface SellerProfile {
  id: string
  name: string
  avatar?: string
  rating: number  // 0-100 score
  ratingCount: number
  badges: SellerBadge[]
  stats: {
    totalOrders: number
    successfulOrders: number
  }
  memberSince: string
  isVerified: boolean
}

export interface User {
  id: string
  username?: string
  name: string
  avatar?: string
  joinedAt: string
  stats: UserStats
  referralCode?: string
  referredBy?: string
  referralCount?: number
  bonusBalance?: number // бонусный баланс в рублях
  isAdmin?: boolean // флаг админа
}

export interface UserStats {
  rating: number
  reviewsCount: number
  ordersCount: number
  returnsCount: number
}

export interface Category {
  id: string
  name: string
  icon?: string
}

export interface Order {
  _id: string
  oderId?: string
  userId: string
  products: OrderProduct[]
  totalPrice: number
  discountAmount?: number
  promoCode?: string
  usedBonuses?: number
  status: 'pending' | 'paid' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
  paymentMethod?: 'cryptobot' | 'cactuspay-sbp' | 'cactuspay-card'
  deliveryData?: string
  deliveryNote?: string
  createdAt: string
  paidAt?: string
  deliveredAt?: string
}

export interface OrderProduct {
  productId: string
  productName?: string
  productImage?: string
  variantId?: string
  variantName?: string
  quantity: number
  price: number
}

export interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  expiresAt?: string
  isActive: boolean
}

export type FilterType = 'all' | 'new' | 'used'

export interface Review {
  _id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  text: string
  orderId?: string
  createdAt: string
  isVerifiedPurchase?: boolean
}

export type SortType = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'newest'

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock?: boolean
  search?: string
  sort?: SortType
  tags?: string[] // filter by tag IDs
}
