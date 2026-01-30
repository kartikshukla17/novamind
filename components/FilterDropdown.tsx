'use client'

import { useState, useRef, useEffect } from 'react'
import { Filter, X, Calendar, Tag, Star, FileText, Link, Image, File, ChevronDown } from 'lucide-react'
import type { SearchFilters, ItemType } from '@/types'

interface FilterDropdownProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  activeCount?: number
}

const ITEM_TYPES: { value: ItemType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
  { value: 'link', label: 'Links', icon: <Link className="h-4 w-4" /> },
  { value: 'image', label: 'Images', icon: <Image className="h-4 w-4" /> },
  { value: 'file', label: 'Files', icon: <File className="h-4 w-4" /> },
]

export function FilterDropdown({ filters, onChange, activeCount = 0 }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleTypeChange(type: ItemType | null) {
    onChange({ ...filters, type })
  }

  function handleFavoriteToggle() {
    onChange({ ...filters, isFavorite: !filters.isFavorite })
  }

  function handleDateChange(field: 'dateFrom' | 'dateTo', value: string) {
    onChange({ ...filters, [field]: value || null })
  }

  function clearFilters() {
    onChange({})
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors ${
          activeCount > 0
            ? 'border-primary-200 dark:border-sky-800 bg-primary-50 dark:bg-sky-900/30 text-primary-700 dark:text-sky-300'
            : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
        }`}
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-600 dark:bg-sky-500 text-white rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="font-medium text-gray-900 dark:text-white">Filters</span>
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 dark:text-sky-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ITEM_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeChange(filters.type === type.value ? null : type.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      filters.type === type.value
                        ? 'bg-primary-100 dark:bg-sky-900/40 text-primary-700 dark:text-sky-300 border border-primary-200 dark:border-sky-700'
                        : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Status
              </label>
              <button
                onClick={handleFavoriteToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
                  filters.isFavorite
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
                    : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 border border-transparent'
                }`}
              >
                <Star className={`h-4 w-4 ${filters.isFavorite ? 'fill-current' : ''}`} />
                Favorites only
              </button>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Date Range
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="From"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleDateChange('dateTo', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-primary-600 dark:bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-primary-700 dark:hover:bg-sky-600 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
