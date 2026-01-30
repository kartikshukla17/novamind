'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ItemCard } from './ItemCard'
import { AddToBoardModal } from './AddToBoardModal'
import type { Item } from '@/types'

interface ItemGridProps {
  items: Item[]
  boardId?: string
  onRefresh?: () => void
}

export function ItemGrid({ items, boardId, onRefresh }: ItemGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const router = useRouter()

  function handleDelete() {
    onRefresh?.() ?? router.refresh()
  }

  async function handleRemoveFromBoard(itemId: string) {
    if (!boardId) return
    await fetch(`/api/boards/${boardId}/items/${itemId}`, { method: 'DELETE' })
    onRefresh?.() ?? router.refresh()
  }

  return (
    <>
      <div className="masonry-grid">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onAddToBoard={boardId ? undefined : (itemId) => setSelectedItemId(itemId)}
            onDelete={handleDelete}
            onRemoveFromBoard={boardId ? handleRemoveFromBoard : undefined}
            boardId={boardId}
          />
        ))}
      </div>

      {selectedItemId && (
        <AddToBoardModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </>
  )
}
