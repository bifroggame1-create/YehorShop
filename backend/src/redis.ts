import Redis from 'ioredis'
import { logCache } from './logger'

// Redis configuration from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Default TTL values in seconds
export const CACHE_TTL = {
  PRODUCTS: 300,        // 5 minutes
  PRODUCT: 300,         // 5 minutes
  PROMO_CODES: 600,     // 10 minutes
  EXCHANGE_RATES: 60,   // 1 minute
  USER_SESSION: 86400,  // 24 hours
}

// Cache key prefixes
export const CACHE_KEYS = {
  PRODUCTS: 'products:all',
  PRODUCT: (id: string) => `products:${id}`,
  PROMO_CODES: 'promo:all',
  PROMO_CODE: (code: string) => `promo:${code}`,
  EXCHANGE_RATES: 'exchange:rates',
  USER: (id: string) => `user:${id}`,
}

class RedisCache {
  private client: Redis | null = null
  private isConnected: boolean = false
  private connectionAttempted: boolean = false

  async connect(): Promise<boolean> {
    if (this.connectionAttempted) {
      return this.isConnected
    }

    this.connectionAttempted = true

    // Skip Redis if not configured
    if (!process.env.REDIS_URL) {
      console.log('⚠️ REDIS_URL not set, caching disabled')
      return false
    }

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('⚠️ Redis connection failed after 3 retries, disabling cache')
            return null
          }
          return Math.min(times * 100, 2000)
        },
        lazyConnect: true,
      })

      this.client.on('error', (err) => {
        console.error('Redis error:', err.message)
        this.isConnected = false
      })

      this.client.on('connect', () => {
        console.log('✅ Redis connected')
        this.isConnected = true
      })

      this.client.on('close', () => {
        console.log('Redis connection closed')
        this.isConnected = false
      })

      await this.client.connect()

      // Test connection
      await this.client.ping()
      this.isConnected = true

      console.log('✅ Redis cache initialized:', {
        url: REDIS_URL.replace(/\/\/.*@/, '//***@'),
        connected: true
      })

      return true
    } catch (error: any) {
      console.warn('⚠️ Redis connection failed:', error.message)
      console.log('Continuing without cache...')
      this.isConnected = false
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null

    try {
      const data = await this.client.get(key)
      if (data) {
        return JSON.parse(data) as T
      }
      return null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) return false

    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized)
      } else {
        await this.client.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false

    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
      return true
    } catch (error) {
      console.error('Redis delPattern error:', error)
      return false
    }
  }

  async invalidateProducts(): Promise<void> {
    await this.del(CACHE_KEYS.PRODUCTS)
    await this.delPattern('products:*')
  }

  async invalidatePromoCodes(): Promise<void> {
    await this.del(CACHE_KEYS.PROMO_CODES)
    await this.delPattern('promo:*')
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetchFn()

    // Cache it
    await this.set(key, data, ttlSeconds)

    return data
  }

  isEnabled(): boolean {
    return this.isConnected
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
      this.isConnected = false
    }
  }
}

export const redis = new RedisCache()
