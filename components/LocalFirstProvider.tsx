'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  initializeAI,
  isAIReady,
  isAILoading,
  getLoadingProgress,
  categorizeContent
} from '@/lib/ai/local-ai'
import {
  createItem,
  getItems,
  updateItem,
  deleteItem,
  searchItems,
  getBoards,
  createBoard,
  getBoardItems,
  addItemToBoard,
  syncToCloud,
  importFromCloud,
  getSyncStatus,
  getStats,
  LocalItem,
  LocalBoard,
  SyncStatus
} from '@/lib/db/local-db'

interface LocalFirstContextType {
  // AI State
  aiReady: boolean
  aiLoading: boolean
  aiProgress: number
  aiStatus: string
  initAI: () => Promise<void>

  // Data State
  items: LocalItem[]
  boards: LocalBoard[]
  loading: boolean
  error: string | null

  // Item Operations
  addItem: (data: AddItemData) => Promise<LocalItem>
  editItem: (id: string, updates: Partial<LocalItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  search: (query: string) => Promise<LocalItem[]>

  // Board Operations
  addBoard: (name: string, description?: string) => Promise<LocalBoard>
  addToBoard: (itemId: string, boardId: string) => Promise<void>
  getBoardItems: (boardId: string) => Promise<LocalItem[]>

  // Sync Operations
  syncStatus: SyncStatus
  syncNow: () => Promise<void>
  refreshFromCloud: () => Promise<void>

  // Refresh
  refreshItems: () => Promise<void>
  refreshBoards: () => Promise<void>
}

interface AddItemData {
  type: 'text' | 'link' | 'image' | 'file'
  content?: string
  url?: string
  title?: string
  file_path?: string
  file_type?: string
  thumbnail_url?: string
  metadata?: Record<string, unknown>
}

const LocalFirstContext = createContext<LocalFirstContextType | null>(null)

export function LocalFirstProvider({ children }: { children: ReactNode }) {
  // AI State
  const [aiReady, setAiReady] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiStatus, setAiStatus] = useState('')

  // Data State
  const [items, setItems] = useState<LocalItem[]>([])
  const [boards, setBoards] = useState<LocalBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingChanges: 0,
    isOnline: true
  })

  const supabase = createClient()

  // Get user on mount
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [supabase])

  // Load data when user is available
  useEffect(() => {
    if (userId) {
      loadData()
      updateSyncStatus()
    }
  }, [userId])

  // Initialize AI in background
  useEffect(() => {
    // Auto-initialize AI after a short delay
    const timer = setTimeout(() => {
      if (!isAIReady() && !isAILoading()) {
        initAI()
      }
    }, 2000) // Wait 2s before starting AI download

    return () => clearTimeout(timer)
  }, [])

  // Update online status
  useEffect(() => {
    const handleOnline = () => updateSyncStatus()
    const handleOffline = () => updateSyncStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function loadData() {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      // First, try to load from local database
      const localItems = await getItems(userId)
      const localBoards = await getBoards(userId)

      setItems(localItems)
      setBoards(localBoards)

      // If online and no local data, fetch from cloud
      if (localItems.length === 0 && navigator.onLine) {
        await refreshFromCloud()
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function updateSyncStatus() {
    const status = await getSyncStatus()
    setSyncStatus(status)
  }

  const initAI = useCallback(async () => {
    if (isAIReady() || isAILoading()) return

    setAiLoading(true)
    try {
      await initializeAI((progress, status) => {
        setAiProgress(progress)
        setAiStatus(status)
      })
      setAiReady(true)
    } catch (err) {
      console.error('Failed to initialize AI:', err)
      // AI is optional, don't set error
    } finally {
      setAiLoading(false)
    }
  }, [])

  const addItem = useCallback(async (data: AddItemData): Promise<LocalItem> => {
    if (!userId) throw new Error('Not authenticated')

    // Create item locally first (instant)
    const item = await createItem(userId, {
      type: data.type,
      content: data.type === 'text' ? data.content : null,
      url: data.type === 'link' ? (data.url || data.content) : null,
      title: data.title || null,
      file_path: data.file_path || null,
      file_type: data.file_type || null,
      thumbnail_url: data.thumbnail_url || null,
      metadata: data.metadata || null
    })

    // Update UI immediately
    setItems(prev => [item, ...prev])

    // Categorize with AI in background
    categorizeInBackground(item)

    // Update sync status
    updateSyncStatus()

    return item
  }, [userId])

  async function categorizeInBackground(item: LocalItem) {
    try {
      const content = item.content || item.url || ''
      if (!content) return

      const result = await categorizeContent(
        content,
        item.type,
        { title: item.title || undefined }
      )

      // Update item with AI results
      const updated = await updateItem(item.id, {
        ai_summary: result.summary,
        ai_tags: result.tags
      })

      // Update UI
      if (updated) {
        setItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, ...updated } : i)
        )
      }
    } catch (err) {
      console.error('AI categorization failed:', err)
      // Non-critical, don't show error to user
    }
  }

  const editItem = useCallback(async (id: string, updates: Partial<LocalItem>) => {
    const updated = await updateItem(id, updates)
    if (updated) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    }
    updateSyncStatus()
  }, [])

  const removeItem = useCallback(async (id: string) => {
    await deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
    updateSyncStatus()
  }, [])

  const toggleFavorite = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    await editItem(id, { is_favorite: !item.is_favorite })
  }, [items, editItem])

  const search = useCallback(async (query: string): Promise<LocalItem[]> => {
    if (!userId) return []
    return searchItems(userId, query)
  }, [userId])

  const addBoard = useCallback(async (name: string, description?: string): Promise<LocalBoard> => {
    if (!userId) throw new Error('Not authenticated')

    const board = await createBoard(userId, { name, description })
    setBoards(prev => [board, ...prev])
    updateSyncStatus()

    return board
  }, [userId])

  const addToBoard = useCallback(async (itemId: string, boardId: string) => {
    await addItemToBoard(itemId, boardId)
    updateSyncStatus()
  }, [])

  const getBoardItemsLocal = useCallback(async (boardId: string): Promise<LocalItem[]> => {
    return getBoardItems(boardId)
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setError('Cannot sync while offline')
      return
    }

    try {
      const result = await syncToCloud(supabase as unknown as { from: (table: string) => unknown })
      console.log(`Synced ${result.synced} items, ${result.errors} errors`)
      updateSyncStatus()
    } catch (err) {
      console.error('Sync failed:', err)
      setError('Failed to sync')
    }
  }, [supabase])

  const refreshFromCloud = useCallback(async () => {
    if (!userId || !navigator.onLine) return

    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        // Import to local database
        await importFromCloud(data as LocalItem[])

        // Refresh local items
        const localItems = await getItems(userId)
        setItems(localItems)
      }

      updateSyncStatus()
    } catch (err) {
      console.error('Failed to refresh from cloud:', err)
    }
  }, [userId, supabase])

  const refreshItems = useCallback(async () => {
    if (!userId) return

    const localItems = await getItems(userId)
    setItems(localItems)
  }, [userId])

  const refreshBoards = useCallback(async () => {
    if (!userId) return

    const localBoards = await getBoards(userId)
    setBoards(localBoards)
  }, [userId])

  return (
    <LocalFirstContext.Provider
      value={{
        aiReady,
        aiLoading,
        aiProgress,
        aiStatus,
        initAI,
        items,
        boards,
        loading,
        error,
        addItem,
        editItem,
        removeItem,
        toggleFavorite,
        search,
        addBoard,
        addToBoard,
        getBoardItems: getBoardItemsLocal,
        syncStatus,
        syncNow,
        refreshFromCloud,
        refreshItems,
        refreshBoards
      }}
    >
      {children}
    </LocalFirstContext.Provider>
  )
}

export function useLocalFirst() {
  const context = useContext(LocalFirstContext)
  if (!context) {
    throw new Error('useLocalFirst must be used within a LocalFirstProvider')
  }
  return context
}
