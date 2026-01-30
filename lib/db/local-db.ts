/**
 * Local-First Database using Dexie (IndexedDB)
 * All data stored locally, optional cloud sync
 */

import Dexie, { Table } from 'dexie'

// Types
export interface LocalItem {
  id: string
  user_id: string
  type: 'text' | 'link' | 'image' | 'file'
  content: string | null
  url: string | null
  file_path: string | null
  file_type: string | null
  title: string | null
  thumbnail_url: string | null
  metadata: Record<string, unknown> | null
  ai_summary: string | null
  ai_tags: string[] | null
  custom_tags: string[] | null
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  synced_at: string | null // null = not synced to cloud
}

export interface LocalBoard {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  created_at: string
  synced_at: string | null
}

export interface LocalItemBoard {
  item_id: string
  board_id: string
  added_at: string
}

export interface SyncStatus {
  lastSync: string | null
  pendingChanges: number
  isOnline: boolean
}

// Database class
class NovamindDB extends Dexie {
  items!: Table<LocalItem, string>
  boards!: Table<LocalBoard, string>
  itemBoards!: Table<LocalItemBoard, [string, string]>
  syncQueue!: Table<{ id: string; table: string; action: 'create' | 'update' | 'delete'; data: unknown; created_at: string }, string>

  constructor() {
    super('novamind')

    this.version(1).stores({
      items: 'id, user_id, type, is_favorite, is_archived, created_at, updated_at, synced_at, *ai_tags, *custom_tags',
      boards: 'id, user_id, name, created_at, synced_at',
      itemBoards: '[item_id+board_id], item_id, board_id',
      syncQueue: 'id, table, action, created_at'
    })
  }
}

// Singleton instance
let db: NovamindDB | null = null

/**
 * Get database instance
 */
export function getDB(): NovamindDB {
  if (!db) {
    db = new NovamindDB()
  }
  return db
}

/**
 * Generate UUID
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current timestamp
 */
function now(): string {
  return new Date().toISOString()
}

// =============================================================================
// ITEM OPERATIONS
// =============================================================================

/**
 * Create a new item locally
 */
export async function createItem(
  userId: string,
  data: Partial<LocalItem>
): Promise<LocalItem> {
  const db = getDB()
  const timestamp = now()

  const item: LocalItem = {
    id: generateId(),
    user_id: userId,
    type: data.type || 'text',
    content: data.content || null,
    url: data.url || null,
    file_path: data.file_path || null,
    file_type: data.file_type || null,
    title: data.title || null,
    thumbnail_url: data.thumbnail_url || null,
    metadata: data.metadata || null,
    ai_summary: data.ai_summary || null,
    ai_tags: data.ai_tags || null,
    custom_tags: data.custom_tags || null,
    is_favorite: data.is_favorite || false,
    is_archived: data.is_archived || false,
    created_at: timestamp,
    updated_at: timestamp,
    synced_at: null // Not synced yet
  }

  await db.items.add(item)

  // Add to sync queue
  await addToSyncQueue('items', 'create', item)

  return item
}

/**
 * Get all items for a user
 */
export async function getItems(
  userId: string,
  options?: {
    includeArchived?: boolean
    type?: string
    isFavorite?: boolean
    tags?: string[]
    limit?: number
    offset?: number
  }
): Promise<LocalItem[]> {
  const db = getDB()

  let query = db.items
    .where('user_id')
    .equals(userId)

  let items = await query.toArray()

  // Apply filters
  if (!options?.includeArchived) {
    items = items.filter(item => !item.is_archived)
  }

  if (options?.type) {
    items = items.filter(item => item.type === options.type)
  }

  if (options?.isFavorite) {
    items = items.filter(item => item.is_favorite)
  }

  if (options?.tags && options.tags.length > 0) {
    items = items.filter(item => {
      const allTags = [...(item.ai_tags || []), ...(item.custom_tags || [])]
      return options.tags!.some(tag => allTags.includes(tag))
    })
  }

  // Sort by created_at descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Apply pagination
  if (options?.offset) {
    items = items.slice(options.offset)
  }
  if (options?.limit) {
    items = items.slice(0, options.limit)
  }

  return items
}

/**
 * Get a single item by ID
 */
export async function getItem(id: string): Promise<LocalItem | undefined> {
  const db = getDB()
  return db.items.get(id)
}

/**
 * Update an item
 */
export async function updateItem(
  id: string,
  updates: Partial<LocalItem>
): Promise<LocalItem | undefined> {
  const db = getDB()

  const updated = {
    ...updates,
    updated_at: now(),
    synced_at: null // Mark as needing sync
  }

  await db.items.update(id, updated)

  const item = await db.items.get(id)
  if (item) {
    await addToSyncQueue('items', 'update', item)
  }

  return item
}

/**
 * Delete an item
 */
export async function deleteItem(id: string): Promise<void> {
  const db = getDB()

  // Remove from boards first
  await db.itemBoards.where('item_id').equals(id).delete()

  // Delete the item
  await db.items.delete(id)

  // Add to sync queue
  await addToSyncQueue('items', 'delete', { id })
}

/**
 * Search items
 */
export async function searchItems(
  userId: string,
  query: string
): Promise<LocalItem[]> {
  const db = getDB()
  const lowercaseQuery = query.toLowerCase()

  const items = await db.items
    .where('user_id')
    .equals(userId)
    .filter(item => {
      if (item.is_archived) return false

      const searchText = [
        item.title,
        item.content,
        item.ai_summary,
        ...(item.ai_tags || []),
        ...(item.custom_tags || [])
      ].filter(Boolean).join(' ').toLowerCase()

      return searchText.includes(lowercaseQuery)
    })
    .toArray()

  return items.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// =============================================================================
// BOARD OPERATIONS
// =============================================================================

/**
 * Create a new board
 */
export async function createBoard(
  userId: string,
  data: Partial<LocalBoard>
): Promise<LocalBoard> {
  const db = getDB()
  const timestamp = now()

  const board: LocalBoard = {
    id: generateId(),
    user_id: userId,
    name: data.name || 'Untitled Board',
    description: data.description || null,
    color: data.color || null,
    icon: data.icon || null,
    created_at: timestamp,
    synced_at: null
  }

  await db.boards.add(board)
  await addToSyncQueue('boards', 'create', board)

  return board
}

/**
 * Get all boards for a user
 */
export async function getBoards(userId: string): Promise<LocalBoard[]> {
  const db = getDB()

  const boards = await db.boards
    .where('user_id')
    .equals(userId)
    .toArray()

  return boards.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * Add item to board
 */
export async function addItemToBoard(itemId: string, boardId: string): Promise<void> {
  const db = getDB()

  const existing = await db.itemBoards.get([itemId, boardId])
  if (existing) return

  await db.itemBoards.add({
    item_id: itemId,
    board_id: boardId,
    added_at: now()
  })

  await addToSyncQueue('itemBoards', 'create', { item_id: itemId, board_id: boardId })
}

/**
 * Get items in a board
 */
export async function getBoardItems(boardId: string): Promise<LocalItem[]> {
  const db = getDB()

  const itemBoards = await db.itemBoards
    .where('board_id')
    .equals(boardId)
    .toArray()

  const itemIds = itemBoards.map(ib => ib.item_id)

  const items = await db.items
    .where('id')
    .anyOf(itemIds)
    .toArray()

  return items.filter(item => !item.is_archived)
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Add operation to sync queue
 */
async function addToSyncQueue(
  table: string,
  action: 'create' | 'update' | 'delete',
  data: unknown
): Promise<void> {
  const db = getDB()

  await db.syncQueue.add({
    id: generateId(),
    table,
    action,
    data,
    created_at: now()
  })
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getDB()

  const pendingCount = await db.syncQueue.count()
  const lastSyncedItem = await db.items
    .where('synced_at')
    .above('')
    .first()

  return {
    lastSync: lastSyncedItem?.synced_at || null,
    pendingChanges: pendingCount,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  }
}

/**
 * Sync local changes to cloud (Supabase)
 * Call this when user is online and wants to sync
 */
export async function syncToCloud(
  supabase: { from: (table: string) => unknown }
): Promise<{ synced: number; errors: number }> {
  const db = getDB()
  let synced = 0
  let errors = 0

  const queue = await db.syncQueue.toArray()

  for (const operation of queue) {
    try {
      const table = supabase.from(operation.table) as { insert: (data: unknown) => Promise<unknown>; update: (data: unknown) => { eq: (field: string, value: unknown) => Promise<unknown> }; delete: () => { eq: (field: string, value: unknown) => Promise<unknown> } }

      const data = operation.data as Record<string, unknown>

      switch (operation.action) {
        case 'create':
          await table.insert(data)
          break
        case 'update':
          await table.update(data).eq('id', data.id)
          break
        case 'delete':
          await table.delete().eq('id', data.id)
          break
      }

      // Remove from queue on success
      await db.syncQueue.delete(operation.id)

      // Mark item as synced
      if (operation.table === 'items' && operation.action !== 'delete') {
        await db.items.update(data.id as string, { synced_at: now() })
      }

      synced++
    } catch (error) {
      console.error('Sync error:', error)
      errors++
    }
  }

  return { synced, errors }
}

/**
 * Import items from cloud to local
 */
export async function importFromCloud(
  items: LocalItem[]
): Promise<number> {
  const db = getDB()
  let imported = 0

  for (const item of items) {
    const existing = await db.items.get(item.id)

    if (!existing) {
      // New item from cloud
      await db.items.add({ ...item, synced_at: now() })
      imported++
    } else if (item.updated_at > existing.updated_at) {
      // Cloud version is newer
      await db.items.update(item.id, { ...item, synced_at: now() })
      imported++
    }
  }

  return imported
}

/**
 * Clear all local data (for logout)
 */
export async function clearLocalData(): Promise<void> {
  const db = getDB()

  await db.items.clear()
  await db.boards.clear()
  await db.itemBoards.clear()
  await db.syncQueue.clear()
}

/**
 * Get database statistics
 */
export async function getStats(userId: string): Promise<{
  totalItems: number
  totalBoards: number
  pendingSync: number
  storageUsed: number
}> {
  const db = getDB()

  const totalItems = await db.items.where('user_id').equals(userId).count()
  const totalBoards = await db.boards.where('user_id').equals(userId).count()
  const pendingSync = await db.syncQueue.count()

  // Estimate storage used (rough calculation)
  const estimate = await navigator.storage?.estimate()
  const storageUsed = estimate?.usage || 0

  return {
    totalItems,
    totalBoards,
    pendingSync,
    storageUsed
  }
}
