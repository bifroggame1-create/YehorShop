/**
 * Migration Script: Single-tenant to Multi-tenant
 *
 * This script migrates existing Yehor Shop data to the multi-tenant architecture:
 * 1. Creates a default "yehorshop" tenant
 * 2. Creates billing record with "free" plan
 * 3. Backfills tenantId on all existing documents
 * 4. Sets up default super admin
 *
 * Run: npx ts-node scripts/migrate-to-multitenant.ts
 */

import { MongoClient, Db } from 'mongodb'
import {
  Tenant,
  TenantBilling,
  SuperAdmin,
  BILLING_PLANS
} from '../src/database'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB_NAME || 'yehorshop'

// Default tenant configuration
const DEFAULT_TENANT_ID = 'yehorshop'
const DEFAULT_TENANT_SLUG = 'yehorshop'
const DEFAULT_SHOP_NAME = 'Yehor Shop Shop'

// Collections that need tenantId backfill
const TENANT_SCOPED_COLLECTIONS = [
  'products',
  'orders',
  'users',
  'promoCodes',
  'sellers',
  'chats',
  'chatMessages',
  'admins',
  'files',
  'auditLogs',
  'tags',
  'referrals',
  'reviews',
  'disputes',
  'escrow',
  'keyReplacements',
  'sellerApplications',
  'tenantAdmins'
]

async function migrate() {
  console.log('='.repeat(60))
  console.log('Yehor Shop Multi-Tenant Migration')
  console.log('='.repeat(60))
  console.log('')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('Connected to MongoDB:', MONGODB_URI)

    const db = client.db(DB_NAME)

    // Step 1: Create default tenant
    console.log('\n1. Creating default tenant...')
    await createDefaultTenant(db)

    // Step 2: Create billing record
    console.log('\n2. Creating billing record...')
    await createDefaultBilling(db)

    // Step 3: Backfill tenantId on all collections
    console.log('\n3. Backfilling tenantId on existing documents...')
    await backfillTenantId(db)

    // Step 4: Create super admin from existing admins
    console.log('\n4. Setting up super admin...')
    await setupSuperAdmin(db)

    console.log('\n' + '='.repeat(60))
    console.log('Migration completed successfully!')
    console.log('='.repeat(60))
    console.log('\nNext steps:')
    console.log('1. Set DEFAULT_TENANT_ID=yehorshop in .env for backward compatibility')
    console.log('2. Update frontend to send X-Tenant-ID header')
    console.log('3. Deploy updated backend with tenant middleware')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

async function createDefaultTenant(db: Db): Promise<void> {
  const tenantsCollection = db.collection<Tenant>('tenants')

  // Check if tenant already exists
  const existing = await tenantsCollection.findOne({ id: DEFAULT_TENANT_ID })
  if (existing) {
    console.log(`   Tenant "${DEFAULT_TENANT_ID}" already exists, skipping...`)
    return
  }

  const now = new Date().toISOString()

  const tenant: Tenant = {
    id: DEFAULT_TENANT_ID,
    slug: DEFAULT_TENANT_SLUG,
    name: DEFAULT_SHOP_NAME,
    status: 'active',
    branding: {
      shopName: DEFAULT_SHOP_NAME,
      primaryColor: '#3B82F6',
      accentColor: '#10B981',
      welcomeMessage: 'Welcome to Yehor Shop Shop!'
    },
    settings: {
      currency: 'RUB',
      language: 'ru',
      timezone: 'Europe/Moscow',
      enableReferrals: true,
      referralBonusAmount: 100,
      enableReviews: true,
      enableChat: true,
      autoDeliveryEnabled: true,
      requireEmailOnCheckout: false,
      notifyAdminsOnNewOrder: true,
      notifyOnPayment: true,
      notifyOnDelivery: true
    },
    commissionRules: {
      platformFeePercent: 0,
      minimumPayout: 1000,
      payoutSchedule: 'instant',
      escrowDaysDefault: 3
    },
    paymentConfig: {
      cryptoBotToken: process.env.CRYPTOBOT_TOKEN,
      cactusPayToken: process.env.CACTUS_API_KEY,
      enabledMethods: ['cryptobot', 'cactuspay-sbp', 'cactuspay-card']
    },
    botToken: process.env.BOT_TOKEN,
    botUsername: process.env.BOT_USERNAME,
    webAppUrl: process.env.WEBAPP_URL,
    ownerEmail: process.env.ADMIN_EMAIL,
    supportTelegram: process.env.SUPPORT_TELEGRAM,
    createdAt: now,
    activatedAt: now
  }

  await tenantsCollection.insertOne(tenant)
  console.log(`   Created tenant: ${DEFAULT_TENANT_ID}`)
}

async function createDefaultBilling(db: Db): Promise<void> {
  const billingCollection = db.collection<TenantBilling>('tenantBilling')

  // Check if billing already exists
  const existing = await billingCollection.findOne({ tenantId: DEFAULT_TENANT_ID })
  if (existing) {
    console.log(`   Billing for "${DEFAULT_TENANT_ID}" already exists, skipping...`)
    return
  }

  const now = new Date().toISOString()

  // Count existing documents for usage stats
  const productsCount = await db.collection('products').countDocuments({ tenantId: { $exists: false } })
    || await db.collection('products').countDocuments({})
  const ordersCount = await db.collection('orders').countDocuments({ tenantId: { $exists: false } })
    || await db.collection('orders').countDocuments({})
  const sellersCount = await db.collection('sellers').countDocuments({ tenantId: { $exists: false } })
    || await db.collection('sellers').countDocuments({})
  const adminsCount = await db.collection('admins').countDocuments({ tenantId: { $exists: false } })
    || await db.collection('admins').countDocuments({})

  // Start with Pro plan for existing shop (has more data)
  const plan = productsCount > 10 || ordersCount > 50 ? 'pro' : 'starter'

  const billing: TenantBilling = {
    tenantId: DEFAULT_TENANT_ID,
    plan: plan,
    status: 'active',
    limits: BILLING_PLANS[plan].limits,
    usage: {
      productsCount,
      ordersThisMonth: ordersCount, // Will be reset next month
      sellersCount,
      adminsCount,
      storageUsedMB: 0,
      lastUpdated: now
    },
    subscription: {
      pricePerMonth: BILLING_PLANS[plan].priceRUB,
      currency: 'RUB'
    },
    billingHistory: [{
      id: `evt_migration_${Date.now()}`,
      type: 'upgrade',
      description: `Migrated to multi-tenant with ${plan} plan`,
      timestamp: now,
      metadata: {
        migratedProducts: productsCount,
        migratedOrders: ordersCount
      }
    }],
    createdAt: now,
    updatedAt: now
  }

  await billingCollection.insertOne(billing)
  console.log(`   Created billing record with plan: ${plan}`)
  console.log(`   Usage: ${productsCount} products, ${ordersCount} orders, ${sellersCount} sellers`)
}

async function backfillTenantId(db: Db): Promise<void> {
  for (const collectionName of TENANT_SCOPED_COLLECTIONS) {
    try {
      const collection = db.collection(collectionName)

      // Count documents without tenantId
      const countWithout = await collection.countDocuments({ tenantId: { $exists: false } })

      if (countWithout === 0) {
        console.log(`   ${collectionName}: No documents to update`)
        continue
      }

      // Update all documents without tenantId
      const result = await collection.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: DEFAULT_TENANT_ID } }
      )

      console.log(`   ${collectionName}: Updated ${result.modifiedCount} documents`)
    } catch (error: any) {
      // Collection might not exist yet
      if (error.code === 26) { // NamespaceNotFound
        console.log(`   ${collectionName}: Collection does not exist (skipped)`)
      } else {
        console.error(`   ${collectionName}: Error - ${error.message}`)
      }
    }
  }
}

async function setupSuperAdmin(db: Db): Promise<void> {
  const superAdminsCollection = db.collection<SuperAdmin>('superAdmins')
  const adminsCollection = db.collection('admins')

  // Check if super admin already exists
  const existingCount = await superAdminsCollection.countDocuments({})
  if (existingCount > 0) {
    console.log('   Super admin(s) already exist, skipping...')
    return
  }

  // Try to promote first admin to super admin
  const firstAdmin = await adminsCollection.findOne({}, { sort: { addedAt: 1 } })

  if (!firstAdmin) {
    console.log('   No existing admins found. Create super admin manually.')
    console.log('   Example: db.superAdmins.insertOne({ id: "YOUR_TELEGRAM_ID", permissions: ["all"], createdAt: new Date().toISOString() })')
    return
  }

  const superAdmin: SuperAdmin = {
    id: firstAdmin.id || firstAdmin.userId,
    username: firstAdmin.username,
    name: firstAdmin.name,
    permissions: ['all'],
    createdAt: new Date().toISOString()
  }

  await superAdminsCollection.insertOne(superAdmin)
  console.log(`   Promoted admin ${superAdmin.id} (${superAdmin.username || 'no username'}) to super admin`)
}

// Run migration
migrate()
