'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RecentSearch, SavedSearch } from '@/types'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, onSearch, placeholder = 'Search items...' }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isFocused && !value) {
      loadSearchHistory()
    }
  }, [isFocused, value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadSearchHistory() {
    const { data: recent } = await supabase
      .from('recent_searches')
      .select('*')
      .order('searched_at', { ascending: false })
      .limit(5)

    const { data: saved } = await supabase
      .from('saved_searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recent) setRecentSearches(recent)
    if (saved) setSavedSearches(saved)
    setShowDropdown(true)
  }

  async function handleSearch(query: string) {
    if (!query.trim()) return

    // Save to recent searches
    await supabase.from('recent_searches').insert({ query: query.trim() })

    onSearch(query)
    setShowDropdown(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch(value)
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  async function clearRecentSearches() {
    await supabase.from('recent_searches').delete().neq('id', '')
    setRecentSearches([])
  }

  return (
    <div className="relative">
      <div className={`relative flex items-center transition-all ${
        isFocused ? 'ring-2 ring-primary-500 dark:ring-sky-500' : ''
      }`}>
        <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (!value) loadSearchHistory()
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none text-sm"
        />
        {value && (
          <button
            onClick={() => {
              onChange('')
              onSearch('')
            }}
            className="absolute right-3 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="h-4 w-4 text-gray-400 dark:text-slate-500" />
          </button>
        )}
      </div>

      {showDropdown && !value && (recentSearches.length > 0 || savedSearches.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Recent</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => {
                    onChange(search.query)
                    handleSearch(search.query)
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
                >
                  <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                  {search.query}
                </button>
              ))}
            </div>
          )}

          {savedSearches.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-slate-700">
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase px-2">Saved Searches</span>
              {savedSearches.map((search) => (
                <button
                  key={search.id}
                  onClick={() => {
                    if (search.query) {
                      onChange(search.query)
                      handleSearch(search.query)
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded mt-1"
                >
                  <Bookmark className="h-3.5 w-3.5 text-primary-500 dark:text-sky-400" />
                  {search.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
