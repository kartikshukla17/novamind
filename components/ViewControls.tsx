'use client'

import { LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import { FilterDropdown } from './FilterDropdown'
import type { ViewMode, SortOption, SortDirection, SearchFilters } from '@/types'

interface ViewControlsProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sortBy: SortOption
  sortDirection: SortDirection
  onSortChange: (sort: SortOption, direction: SortDirection) => void
  filters: SearchFilters
  onFilterChange: (filters: SearchFilters) => void
  activeFiltersCount?: number
}

export function ViewControls({
  viewMode,
  onViewModeChange,
  sortBy,
  sortDirection,
  onSortChange,
  filters,
  onFilterChange,
  activeFiltersCount = 0,
}: ViewControlsProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Date Modified' },
    { value: 'title', label: 'Title' },
    { value: 'type', label: 'Type' },
  ]

  return (
    <div className="flex items-center gap-2">
      {/* Filter Dropdown */}
      <FilterDropdown
        filters={filters}
        onChange={onFilterChange}
        activeCount={activeFiltersCount}
      />

      {/* Sort Dropdown */}
      <div className="relative group">
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-warm-200 dark:border-warm-600 rounded-xl text-sm text-warm-600 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-700">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">Sort</span>
        </button>
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
          <div className="p-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (sortBy === option.value) {
                    onSortChange(option.value, sortDirection === 'asc' ? 'desc' : 'asc')
                  } else {
                    onSortChange(option.value, 'desc')
                  }
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between ${
                  sortBy === option.value
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-warm-700 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-700'
                }`}
              >
                {option.label}
                {sortBy === option.value && (
                  <span className="text-xs text-warm-500 dark:text-warm-400">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center border border-warm-200 dark:border-warm-600 rounded-xl overflow-hidden">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-1.5 ${
            viewMode === 'grid'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'text-warm-400 dark:text-warm-500 hover:text-warm-600 dark:hover:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-700'
          }`}
          title="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-1.5 ${
            viewMode === 'list'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'text-warm-400 dark:text-warm-500 hover:text-warm-600 dark:hover:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-700'
          }`}
          title="List view"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
