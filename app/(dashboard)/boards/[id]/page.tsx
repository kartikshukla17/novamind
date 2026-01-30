import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoardDetailClient } from '@/components/BoardDetailClient'
import type { Item, Board } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single()

  if (boardError || !board) {
    notFound()
  }

  const { data: itemBoards } = await supabase
    .from('item_boards')
    .select('item_id')
    .eq('board_id', id)

  const itemIds = itemBoards?.map(ib => ib.item_id) || []

  let items: Item[] = []
  if (itemIds.length > 0) {
    const { data } = await supabase
      .from('items')
      .select('*')
      .in('id', itemIds)
      .order('created_at', { ascending: false })

    items = (data as Item[]) || []
  }

  return (
    <BoardDetailClient board={board as Board} items={items} />
  )
}
