import { logger } from './logger'
import {
  loadProducts,
  loadPromoCodes,
  loadOrders,
  loadUsers,
  loadSellers,
  loadChats,
  saveProducts,
  savePromoCodes,
  saveOrders,
  saveUsers,
  getChatMessages
} from './dataStore'

// Backup data structure
interface BackupData {
  version: string
  createdAt: string
  collections: {
    products: any[]
    promoCodes: any[]
    orders: any[]
    users: any[]
    sellers: any[]
    chats: any[]
  }
}

/**
 * Create a full backup of all data
 */
export async function createBackup(): Promise<BackupData> {
  logger.info('Starting database backup...')

  try {
    const [products, promoCodes, orders, users, sellers, chats] = await Promise.all([
      loadProducts(),
      loadPromoCodes(),
      loadOrders(),
      loadUsers(),
      loadSellers(),
      loadChats()
    ])

    const backup: BackupData = {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      collections: {
        products,
        promoCodes,
        orders,
        users,
        sellers,
        chats
      }
    }

    logger.info({
      products: products.length,
      promoCodes: promoCodes.length,
      orders: orders.length,
      users: users.length,
      sellers: sellers.length,
      chats: chats.length
    }, 'Backup created successfully')

    return backup
  } catch (error) {
    logger.error({ err: error }, 'Backup failed')
    throw error
  }
}

/**
 * Restore data from backup
 */
export async function restoreFromBackup(backup: BackupData): Promise<{
  success: boolean
  restored: Record<string, number>
}> {
  logger.info({ version: backup.version, createdAt: backup.createdAt }, 'Starting database restore...')

  const restored: Record<string, number> = {}

  try {
    // Restore each collection
    if (backup.collections.products?.length) {
      await saveProducts(backup.collections.products)
      restored.products = backup.collections.products.length
    }

    if (backup.collections.promoCodes?.length) {
      await savePromoCodes(backup.collections.promoCodes)
      restored.promoCodes = backup.collections.promoCodes.length
    }

    if (backup.collections.orders?.length) {
      await saveOrders(backup.collections.orders)
      restored.orders = backup.collections.orders.length
    }

    if (backup.collections.users?.length) {
      await saveUsers(backup.collections.users)
      restored.users = backup.collections.users.length
    }

    logger.info({ restored }, 'Restore completed successfully')

    return { success: true, restored }
  } catch (error) {
    logger.error({ err: error }, 'Restore failed')
    throw error
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  estimatedSize: string
  collections: Record<string, number>
}> {
  const [products, promoCodes, orders, users, sellers, chats] = await Promise.all([
    loadProducts(),
    loadPromoCodes(),
    loadOrders(),
    loadUsers(),
    loadSellers(),
    loadChats()
  ])

  const collections = {
    products: products.length,
    promoCodes: promoCodes.length,
    orders: orders.length,
    users: users.length,
    sellers: sellers.length,
    chats: chats.length
  }

  // Estimate size (rough approximation)
  const totalItems = Object.values(collections).reduce((a, b) => a + b, 0)
  const estimatedBytes = totalItems * 500 // ~500 bytes per document average
  const estimatedSize = formatBytes(estimatedBytes)

  return { estimatedSize, collections }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate backup data structure
 */
export function validateBackup(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.version) {
    errors.push('Missing version field')
  }

  if (!data.createdAt) {
    errors.push('Missing createdAt field')
  }

  if (!data.collections) {
    errors.push('Missing collections field')
  } else {
    const expectedCollections = ['products', 'promoCodes', 'orders', 'users', 'sellers', 'chats']
    for (const col of expectedCollections) {
      if (!Array.isArray(data.collections[col])) {
        errors.push(`Invalid or missing collection: ${col}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
