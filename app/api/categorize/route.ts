import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorizeContent } from '@/lib/ai/server-categorize'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { item_id } = body

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    // Fetch the item
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Categorize the content
    const contentToAnalyze = item.type === 'link' ? item.url : item.content
    if (!contentToAnalyze) {
      return NextResponse.json({ error: 'No content to categorize' }, { status: 400 })
    }

    const result = categorizeContent(
      contentToAnalyze,
      item.type,
      (item.metadata as Record<string, unknown>) || undefined
    )

    // Update item with AI results
    const { error: updateError } = await supabase
      .from('items')
      .update({
        ai_summary: result.summary,
        ai_tags: result.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Find or create the AI category
    const { data: category } = await supabase
      .from('ai_categories')
      .select('id')
      .eq('name', result.category)
      .single()

    if (category) {
      // Link item to category (upsert to handle existing)
      await supabase
        .from('item_ai_categories')
        .upsert({
          item_id,
          category_id: category.id,
          confidence: 0.9,
        })
    }

    return NextResponse.json({
      category: result.category,
      tags: result.tags,
      summary: result.summary,
    })
  } catch (error) {
    console.error('Error categorizing:', error)
    return NextResponse.json({ error: 'Failed to categorize' }, { status: 500 })
  }
}
