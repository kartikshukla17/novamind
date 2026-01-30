'use client'

import { useState, useEffect } from 'react'
import { X, Filter, Calendar, Tag, Folder, Star, FileText, Link, Image, File } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SearchFilters, ItemType, Board, AICategory } from '@/types'

interface FilterSidebarProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  isOpen: boolean
  onClose: () => void
}

export function FilterSidebar({ filters, onChange, isOpen, onClose }: FilterSidebarProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [categories, setCategories] = useState<AICategory[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadFilterOptions()
  }, [])

  async function loadFilterOptions() {
    const [boardsRes, categoriesRes, tagsRes] = await Promise.all([
      supabase.from('boards').select('*').order('name'),
      supabase.from('ai_categories').select('*').order('name'),
      supabase.from('items').select('ai_tags, custom_tags'),
    ])

    if (boardsRes.data) setBoards(boardsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)

    // Extract unique tags
    if (tagsRes.data) {
      const tags = new Set<string>()
      tagsRes.data.forEach((item) => {
        item.ai_tags?.forEach((tag: string) => tags.add(tag))
        item.custom_tags?.forEach((tag: string) => tags.add(tag))
      })
      setAllTags(Array.from(tags).sort())
    }
  }

  function updateFilter<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function clearFilters() {
    onChange({})
  }

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  )

  const typeOptions: { value: ItemType; label: string; icon: React.ReactNode }[] = [
    { value: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
    { value: 'link', label: 'Link', icon: <Link className="h-4 w-4" /> },
    { value: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> },
    { value: 'file', label: 'File', icon: <File className="h-4 w-4" /> },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 z-50 overflow-y-auto lg:relative lg:z-0">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Clear all
              </button>
            )}
            <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
            <div className="space-y-1">
              {typeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="type"
                    checked={filters.type === option.value}
                    onChange={() =>
                      updateFilter('type', filters.type === option.value ? null : option.value)
                    }
                    className="text-primary-600"
                  />
                  {option.icon}
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="To"
              />
            </div>
          </div>

          {/* Favorites */}
          <div>
            <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isFavorite || false}
                onChange={(e) => updateFilter('isFavorite', e.target.checked || undefined)}
                className="text-primary-600 rounded"
              />
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-700">Favorites only</span>
            </label>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Board */}
          {boards.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Board
              </label>
              <select
                value={filters.boardId || ''}
                onChange={(e) => updateFilter('boardId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All boards</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {allTags.slice(0, 20).map((tag) => {
                  const isSelected = filters.tags?.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        const newTags = isSelected
                          ? filters.tags?.filter((t) => t !== tag)
                          : [...(filters.tags || []), tag]
                        updateFilter('tags', newTags?.length ? newTags : undefined)
                      }}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        isSelected
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
