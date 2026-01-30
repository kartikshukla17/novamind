'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Check, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Board } from '@/types'

interface AddToBoardModalProps {
  itemId: string
  onClose: () => void
}

export function AddToBoardModal({ itemId, onClose }: AddToBoardModalProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [itemBoards, setItemBoards] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const [boardsRes, itemBoardsRes] = await Promise.all([
        supabase.from('boards').select('*').order('name'),
        supabase.from('item_boards').select('board_id').eq('item_id', itemId),
      ])

      if (boardsRes.data) {
        setBoards(boardsRes.data)
      }

      if (itemBoardsRes.data) {
        setItemBoards(new Set(itemBoardsRes.data.map(ib => ib.board_id)))
      }

      setLoading(false)
    }

    loadData()
  }, [itemId, supabase])

  async function toggleBoard(boardId: string) {
    setSaving(boardId)

    try {
      if (itemBoards.has(boardId)) {
        // Remove from board
        await fetch(`/api/boards/${boardId}/items/${itemId}`, {
          method: 'DELETE',
        })
        setItemBoards(prev => {
          const next = new Set(prev)
          next.delete(boardId)
          return next
        })
      } else {
        // Add to board
        await fetch(`/api/boards/${boardId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId }),
        })
        setItemBoards(prev => new Set([...prev, boardId]))
      }
    } catch (err) {
      console.error('Failed to update board:', err)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add to Board</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-slate-500" />
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-slate-400 mb-4">No boards yet.</p>
              <button
                onClick={() => {
                  onClose()
                  router.push('/boards')
                }}
                className="text-primary-600 dark:text-sky-400 hover:text-primary-700 dark:hover:text-sky-300 font-medium transition-colors"
              >
                Create your first board
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {boards.map((board) => {
                const isInBoard = itemBoards.has(board.id)
                const isSaving = saving === board.id

                return (
                  <button
                    key={board.id}
                    onClick={() => toggleBoard(board.id)}
                    disabled={isSaving}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: board.color || '#e5e7eb' }}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : isInBoard ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <Plus className="h-4 w-4 text-white/70" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {board.name}
                      </p>
                      {board.description && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                          {board.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
