'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Board } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { Sparkles, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'

interface BoardCardProps {
  board: Board
  itemCount?: number
}

export function BoardCard({ board, itemCount = 0 }: BoardCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDeleteBoard(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete board "${board.name}"? This will not delete your items.`)) return
    setDeleting(true)
    const res = await fetch(`/api/boards/${board.id}`, { method: 'DELETE' })
    setDeleting(false)
    setShowMenu(false)
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <div className="relative block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md dark:hover:border-slate-600 transition-all animate-fade-in group">
      <Link href={`/boards/${board.id}`} className="block">
        {/* Color Header */}
        <div
          className="h-24 relative"
          style={{ backgroundColor: board.color || '#e5e7eb' }}
        >
          {board.is_ai_generated && (
            <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary-600 dark:text-sky-400" />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">AI</span>
            </div>
          )}
          {/* Menu button - stops propagation so Link doesn't fire */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Board menu"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{board.name}</h3>
          {board.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2 line-clamp-2">
              {board.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
            <span>{itemCount} items</span>
            <span>{formatRelativeTime(board.created_at)}</span>
          </div>
        </div>
      </Link>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
            }}
          />
          <div className="absolute top-12 right-2 z-20 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1">
            <button
              onClick={handleDeleteBoard}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete board
            </button>
          </div>
        </>
      )}
    </div>
  )
}
