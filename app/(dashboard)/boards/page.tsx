import { createClient } from '@/lib/supabase/server'
import { BoardGrid } from '@/components/BoardGrid'
import { CreateBoardButton } from '@/components/CreateBoardButton'
import { FolderKanban, Plus, Sparkles } from 'lucide-react'
import type { Board } from '@/types'

export default async function BoardsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: boards, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching boards:', error)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-sm font-bold text-warm-900 dark:text-warm-50">Boards</h1>
          <p className="text-warm-500 dark:text-warm-400 mt-1">
            {boards?.length || 0} mood boards
          </p>
        </div>
        <CreateBoardButton />
      </div>

      {boards && boards.length > 0 ? (
        <BoardGrid boards={boards as Board[]} />
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-accent-100 to-primary-100 dark:from-accent-900/50 dark:to-primary-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <FolderKanban className="h-10 w-10 text-accent-500" />
      </div>
      <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">No boards yet</h2>
      <p className="text-warm-500 dark:text-warm-400 max-w-sm mx-auto mb-6">
        Create mood boards to visually organize your ideas and inspiration. Group related items together.
      </p>
      <div className="inline-flex flex-col items-center gap-3">
        <CreateBoardButton />
        <div className="flex items-center gap-2 text-sm text-warm-400 dark:text-warm-500">
          <Sparkles className="h-4 w-4" />
          <span>Tip: AI can suggest boards based on your content</span>
        </div>
      </div>
    </div>
  )
}
