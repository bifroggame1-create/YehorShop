import { getDB } from './database'
import { ObjectId } from 'mongodb'

// Permission types
export type Permission =
  | 'products.view' | 'products.create' | 'products.edit' | 'products.delete'
  | 'orders.view' | 'orders.manage' | 'orders.deliver' | 'orders.cancel' | 'orders.refund'
  | 'users.view' | 'users.edit'
  | 'sellers.view' | 'sellers.create' | 'sellers.edit' | 'sellers.delete'
  | 'admins.view' | 'admins.manage'
  | 'promo.view' | 'promo.create' | 'promo.edit' | 'promo.delete'
  | 'reviews.view' | 'reviews.manage'
  | 'files.view' | 'files.upload' | 'files.delete'
  | 'statistics.view'
  | 'audit.view'
  | 'settings.view' | 'settings.edit'
  | 'webhooks.view' | 'webhooks.manage'
  | '*' // Super admin - all permissions

// Role interface
export interface AdminRole {
  _id?: ObjectId | string
  id: string
  name: string
  description?: string
  permissions: Permission[]
  isSystem?: boolean // Cannot be deleted
  createdAt: string
  updatedAt?: string
}

// Admin-Role assignment
export interface AdminRoleAssignment {
  _id?: ObjectId | string
  adminId: string
  roleId: string
  assignedAt: string
  assignedBy?: string
}

// Default roles
const DEFAULT_ROLES: Omit<AdminRole, '_id'>[] = [
  {
    id: 'super_admin',
    name: 'Супер-админ',
    description: 'Полный доступ ко всем функциям',
    permissions: ['*'],
    isSystem: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'admin',
    name: 'Администратор',
    description: 'Управление товарами, заказами и пользователями',
    permissions: [
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'orders.view', 'orders.manage', 'orders.deliver', 'orders.cancel',
      'users.view',
      'sellers.view', 'sellers.create', 'sellers.edit',
      'promo.view', 'promo.create', 'promo.edit',
      'reviews.view', 'reviews.manage',
      'files.view', 'files.upload',
      'statistics.view'
    ],
    isSystem: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'moderator',
    name: 'Модератор',
    description: 'Обработка заказов и модерация отзывов',
    permissions: [
      'products.view',
      'orders.view', 'orders.manage', 'orders.deliver',
      'users.view',
      'reviews.view', 'reviews.manage',
      'statistics.view'
    ],
    isSystem: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'support',
    name: 'Поддержка',
    description: 'Просмотр заказов и помощь пользователям',
    permissions: [
      'products.view',
      'orders.view',
      'users.view',
      'reviews.view'
    ],
    isSystem: true,
    createdAt: new Date().toISOString()
  }
]

// Get roles collection
function getRolesCollection() {
  return getDB().collection<AdminRole>('adminRoles')
}

// Get role assignments collection
function getAssignmentsCollection() {
  return getDB().collection<AdminRoleAssignment>('adminRoleAssignments')
}

// Initialize default roles
export async function initializeRoles(): Promise<void> {
  const collection = getRolesCollection()

  for (const role of DEFAULT_ROLES) {
    const existing = await collection.findOne({ id: role.id })
    if (!existing) {
      await collection.insertOne(role as AdminRole)
      console.log(`[Roles] Created default role: ${role.name}`)
    }
  }
}

// Get all roles
export async function getAllRoles(): Promise<AdminRole[]> {
  return getRolesCollection().find({}).toArray()
}

// Get role by ID
export async function getRoleById(id: string): Promise<AdminRole | null> {
  return getRolesCollection().findOne({ id })
}

// Create new role
export async function createRole(role: Omit<AdminRole, '_id' | 'id' | 'createdAt'>): Promise<AdminRole> {
  const newRole: AdminRole = {
    ...role,
    id: `role_${Date.now()}`,
    isSystem: false,
    createdAt: new Date().toISOString()
  }

  await getRolesCollection().insertOne(newRole)
  return newRole
}

// Update role
export async function updateRole(id: string, updates: Partial<AdminRole>): Promise<AdminRole | null> {
  const existing = await getRoleById(id)
  if (!existing) return null

  // Cannot modify system roles' permissions
  if (existing.isSystem && updates.permissions) {
    delete updates.permissions
  }

  const result = await getRolesCollection().findOneAndUpdate(
    { id },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  )

  return result
}

// Delete role
export async function deleteRole(id: string): Promise<boolean> {
  const existing = await getRoleById(id)
  if (!existing || existing.isSystem) return false

  // Remove all assignments
  await getAssignmentsCollection().deleteMany({ roleId: id })

  const result = await getRolesCollection().deleteOne({ id })
  return result.deletedCount > 0
}

// Assign role to admin
export async function assignRole(adminId: string, roleId: string, assignedBy?: string): Promise<AdminRoleAssignment> {
  // Remove existing assignment
  await getAssignmentsCollection().deleteMany({ adminId })

  const assignment: AdminRoleAssignment = {
    adminId,
    roleId,
    assignedAt: new Date().toISOString(),
    assignedBy
  }

  await getAssignmentsCollection().insertOne(assignment)
  return assignment
}

// Get admin's role
export async function getAdminRole(adminId: string): Promise<AdminRole | null> {
  const assignment = await getAssignmentsCollection().findOne({ adminId })
  if (!assignment) {
    // Default to 'admin' role if not assigned
    return getRoleById('admin')
  }

  return getRoleById(assignment.roleId)
}

// Check if admin has permission
export async function hasPermission(adminId: string, permission: Permission): Promise<boolean> {
  const role = await getAdminRole(adminId)
  if (!role) return false

  // Super admin has all permissions
  if (role.permissions.includes('*')) return true

  // Check specific permission
  if (role.permissions.includes(permission)) return true

  // Check category wildcard (e.g., products.* for products.view)
  const category = permission.split('.')[0]
  if (role.permissions.includes(`${category}.*` as Permission)) return true

  return false
}

// Check multiple permissions (all required)
export async function hasAllPermissions(adminId: string, permissions: Permission[]): Promise<boolean> {
  for (const perm of permissions) {
    if (!await hasPermission(adminId, perm)) {
      return false
    }
  }
  return true
}

// Check multiple permissions (any required)
export async function hasAnyPermission(adminId: string, permissions: Permission[]): Promise<boolean> {
  for (const perm of permissions) {
    if (await hasPermission(adminId, perm)) {
      return true
    }
  }
  return false
}

// Get all admins with their roles
export async function getAdminsWithRoles(): Promise<Array<{ adminId: string; role: AdminRole | null }>> {
  const assignments = await getAssignmentsCollection().find({}).toArray()
  const roles = await getAllRoles()

  const roleMap = new Map(roles.map(r => [r.id, r]))

  return assignments.map(a => ({
    adminId: a.adminId,
    role: roleMap.get(a.roleId) || null
  }))
}

console.log('[AdminRoles] Module loaded')
