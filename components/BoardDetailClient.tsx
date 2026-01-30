'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, ListMinus, Loader2 } from 'lucide-react'
import { ItemGrid } from './ItemGrid'
import type { Item, Board } from '@/types'

interface BoardDetailClientProps {
  board: Board
  items: Item[]
}

export function BoardDetailClient({ board, items }: BoardDetailClientProps) {
  const [deleting, setDeleting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const router = useRouter()

  async function handleDeleteBoard() {
    if (!confirm(`Delete board "${board.name}"? This will not delete your items.`)) return
    setDeleting(true)
    const res = await fetch(`/api/boards/${board.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      router.push('/boards')
      router.refresh()
    }
  }

  async function handleRemoveAllFromBoard() {
    if (!confirm(`Remove all ${items.length} items from this board? Items will stay in All Items.`)) return
    setClearing(true)
    const res = await fetch(`/api/boards/${board.id}/items`, { method: 'DELETE' })
    setClearing(false)
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <div>
      <Link
        href="/boards"
        className="inline-flex items-center gap-1 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Boards
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {board.color && (
            <div
              className="w-12 h-12 rounded-lg flex-shrink-0"
              style={{ backgroundColor: board.color }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{board.name}</h1>
            {board.description && (
              <p className="text-gray-500 dark:text-slate-400 mt-1">{board.description}</p>
            )}
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              {items.length} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {items.length > 0 && (
            <button
              onClick={handleRemoveAllFromBoard}
              disabled={clearing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors disabled:opacity-50"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListMinus className="h-4 w-4" />}
              Remove all from board
            </button>
          )}
          <button
            onClick={handleDeleteBoard}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete board
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <ItemGrid items={items} boardId={board.id} onRefresh={() => router.refresh()} />
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-slate-400">No items in this board yet.</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            Add items to this board from the All Items view.
          </p>
        </div>
      )}
    </div>
  )
}
