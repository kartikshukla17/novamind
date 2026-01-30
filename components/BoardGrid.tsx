import { BoardCard } from './BoardCard'
import type { Board } from '@/types'

interface BoardGridProps {
  boards: Board[]
}

export function BoardGrid({ boards }: BoardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  )
}
