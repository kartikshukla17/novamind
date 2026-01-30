'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItemCard } from '@/components/ItemCard'
import { UploadButton } from '@/components/UploadButton'
import { SearchBar } from '@/components/SearchBar'
import { ViewControls } from '@/components/ViewControls'
import { FilterDropdown } from '@/components/FilterDropdown'
import { ItemDetailsModal } from '@/components/ItemDetailsModal'
import { AddToBoardModal } from '@/components/AddToBoardModal'
import { Loader2, Trash2, X, Trash, Package, Sparkles, Plus, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Item, SearchFilters, SortOption, SortDirection, ViewMode } from '@/types'

export default function AllItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIntent, setSearchIntent] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [addToBoardItemId, setAddToBoardItemId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [pasteStatus, setPasteStatus] = useState<'saving' | 'saved' | 'error' | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Load items
  useEffect(() => {
    loadItems()
  }, [])

  // Paste image anywhere on /all page – save to Novamind
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          e.preventDefault()
          e.stopPropagation()
          setPasteStatus('saving')
          try {
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            if (!uploadRes.ok) throw new Error('Upload failed')
            const uploadData = await uploadRes.json()
            const createRes = await fetch('/api/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: uploadData.isImage ? 'image' : 'file',
                title: file.name || 'Image from clipboard',
                file_path: uploadData.path,
                file_type: uploadData.mimeType,
                thumbnail_url: uploadData.isImage ? uploadData.publicUrl : null,
              }),
            })
            if (!createRes.ok) throw new Error('Create failed')
            setPasteStatus('saved')
            loadItems()
          } catch {
            setPasteStatus('error')
          }
          setTimeout(() => setPasteStatus(null), 3000)
          return
        }
      }
    }
    document.addEventListener('paste', handlePaste, true)
    return () => document.removeEventListener('paste', handlePaste, true)
  }, [])

  async function loadItems() {
    setLoading(true)

    // Get authenticated user first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      console.log('No user found:', authError)
      setLoading(false)
      return
    }

    console.log('Loading items for user:', user.id)

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('Items query result:', { data, error })

    if (error) {
      console.error('Error loading items:', error)
    }

    if (data) {
      // Filter out archived items client-side (column may not exist)
      const activeItems = data.filter((item: Item) => !item.is_archived)
      setItems(activeItems)
    }
    setLoading(false)
  }

  // Semantic search function (local processing - no external API)
  const performSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredItems(items)
      setSearchIntent(null)
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      
      if (data.results) {
        // Merge with full item data from local state
        const searchResults = data.results.map((result: Item & { relevanceScore?: number; matchReason?: string }) => {
          const fullItem = items.find(i => i.id === result.id)
          return fullItem ? { ...fullItem, relevanceScore: result.relevanceScore, matchReason: result.matchReason } : result
        })
        setFilteredItems(searchResults)
        setSearchIntent(data.parsed?.intent || null)
      }
    } catch (error) {
      console.error('Search error:', error)
      // Fall back to client-side search
      applyClientSideFilters(query)
    } finally {
      setSearching(false)
    }
  }, [items])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      applyClientSideFilters('')
      return
    }

    // Debounce search for 500ms
    searchTimeoutRef.current = setTimeout(() => {
      performSemanticSearch(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSemanticSearch])

  // Client-side filter function (for non-search filtering)
  function applyClientSideFilters(query: string) {
    let result = [...items]

    // Search (basic client-side fallback)
    if (query) {
      const lowerQuery = query.toLowerCase()
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(lowerQuery) ||
          item.content?.toLowerCase().includes(lowerQuery) ||
          item.ai_summary?.toLowerCase().includes(lowerQuery) ||
          item.ai_description?.toLowerCase().includes(lowerQuery) ||
          item.ai_tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          item.custom_tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      )
    }

    // Type filter
    if (filters.type) {
      result = result.filter((item) => item.type === filters.type)
    }

    // Date filters
    if (filters.dateFrom) {
      result = result.filter((item) => item.created_at >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      result = result.filter((item) => item.created_at <= filters.dateTo!)
    }

    // Favorites filter
    if (filters.isFavorite) {
      result = result.filter((item) => item.is_favorite)
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((item) =>
        filters.tags!.some(
          (tag) =>
            item.ai_tags?.includes(tag) || item.custom_tags?.includes(tag)
        )
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortBy) {
        case 'created_at':
        case 'updated_at':
          aVal = new Date(a[sortBy]).getTime()
          bVal = new Date(b[sortBy]).getTime()
          break
        case 'title':
          aVal = (a.title || '').toLowerCase()
          bVal = (b.title || '').toLowerCase()
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    setFilteredItems(result)
    setSearchIntent(null)
  }

  // Apply filters when non-search filters change
  useEffect(() => {
    if (!searchQuery) {
      applyClientSideFilters('')
    }
  }, [items, filters, sortBy, sortDirection])

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  ).length

  // Handle item updates
  function handleItemUpdate(updatedItem: Item) {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem)
    }
  }

  // Handle item delete
  function handleItemDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  // Handle selection
  function handleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Bulk delete
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} items?`)) return

    const ids = Array.from(selectedIds)
    await supabase.from('items').delete().in('id', ids)
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  // Cancel selection
  function cancelSelection() {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  // Delete all items
  async function handleDeleteAll() {
    if (items.length === 0) return
    if (!confirm(`Permanently delete all ${items.length} items? This cannot be undone.`)) return
    setDeletingAll(true)
    const res = await fetch('/api/items', { method: 'DELETE' })
    setDeletingAll(false)
    if (res.ok) {
      setItems([])
      setFilteredItems([])
      setSelectedIds(new Set())
      setSelectionMode(false)
      setSelectedItem(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
        <p className="text-warm-500 dark:text-warm-400 text-sm">Loading your items...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Paste feedback toast */}
      {pasteStatus && (
        <div
          className={cn(
            'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-in',
            pasteStatus === 'saving' && 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
            pasteStatus === 'saved' && 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
            pasteStatus === 'error' && 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
          )}
        >
          {pasteStatus === 'saving' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving image...
            </>
          )}
          {pasteStatus === 'saved' && (
            <>
              <Sparkles className="h-4 w-4" />
              Image saved!
            </>
          )}
          {pasteStatus === 'error' && (
            <>
              <X className="h-4 w-4" />
              Failed to save image
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-display-sm font-bold text-warm-900 dark:text-warm-50">All Items</h1>
            <p className="text-warm-500 dark:text-warm-400 mt-1">
              {filteredItems.length === items.length
                ? `${items.length} items in your second brain`
                : `${filteredItems.length} of ${items.length} items`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl font-medium transition-all disabled:opacity-50"
                title="Delete all items"
              >
                {deletingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Delete all</span>
              </button>
            )}
            <UploadButton onUpload={loadItems} />
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={setSearchQuery}
                placeholder="Search naturally... e.g. 'that screenshot' or 'recipe with pasta'"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                </div>
              )}
            </div>
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortChange={(sort, dir) => {
                setSortBy(sort)
                setSortDirection(dir)
              }}
              filters={filters}
              onFilterChange={setFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>
          
          {/* Smart Search Intent Display */}
          {searchIntent && searchQuery && (
            <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-xl">
              <Brain className="h-4 w-4" />
              <span>Looking for: <span className="font-medium">{searchIntent}</span></span>
            </div>
          )}
        </div>

        {/* Selection toolbar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 rounded-xl animate-fade-in">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={cancelSelection}
              className="flex items-center gap-2 px-4 py-2 text-sm text-warm-600 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-lg font-medium transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        )}

        {/* Quick filter for selection mode */}
        {!selectionMode && items.length > 0 && (
          <button
            onClick={() => setSelectionMode(true)}
            className="text-sm text-warm-500 dark:text-warm-400 hover:text-primary-600 dark:hover:text-primary-400 self-start transition-colors"
          >
            Select items for bulk actions
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        {filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="masonry-grid">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
                >
                  <ItemCard
                    item={item}
                    viewMode={viewMode}
                    onClick={() => setSelectedItem(item)}
                    onAddToBoard={() => setAddToBoardItemId(item.id)}
                    onUpdate={handleItemUpdate}
                    onDelete={handleItemDelete}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={handleSelect}
                    selectionMode={selectionMode}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-warm-800 rounded-2xl border border-warm-200 dark:border-warm-700 overflow-hidden shadow-soft">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  viewMode={viewMode}
                  onClick={() => setSelectedItem(item)}
                  onAddToBoard={() => setAddToBoardItemId(item.id)}
                  onUpdate={handleItemUpdate}
                  onDelete={handleItemDelete}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState hasFilters={!!searchQuery || activeFiltersCount > 0} />
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={handleItemDelete}
        />
      )}

      {/* Add to Board Modal */}
      {addToBoardItemId && (
        <AddToBoardModal
          itemId={addToBoardItemId}
          onClose={() => setAddToBoardItemId(null)}
        />
      )}
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/50 dark:to-accent-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        {hasFilters ? (
          <Package className="h-10 w-10 text-primary-500" />
        ) : (
          <Sparkles className="h-10 w-10 text-primary-500" />
        )}
      </div>
      {hasFilters ? (
        <>
          <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">No matching items</h2>
          <p className="text-warm-500 dark:text-warm-400 max-w-sm mx-auto">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">Your second brain is empty</h2>
          <p className="text-warm-500 dark:text-warm-400 max-w-sm mx-auto mb-6">
            Start capturing your ideas, links, images, and notes. AI will organize everything for you.
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium cursor-pointer hover:bg-primary-700 transition-colors">
            <Plus className="h-5 w-5" />
            Add your first item
          </div>
        </>
      )}
    </div>
  )
}
