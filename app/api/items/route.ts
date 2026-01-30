import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { extractLinkMetadata } from '@/lib/utils/link-metadata'
import { categorizeContent } from '@/lib/ai/server-categorize'

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  let itemsQuery = supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (query) {
    itemsQuery = itemsQuery.or(`content.ilike.%${query}%,title.ilike.%${query}%,ai_summary.ilike.%${query}%`)
  }

  const { data, error } = await itemsQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, content, url, title, file_path, file_type, thumbnail_url } = body

    // Determine item type and content
    let itemType = type
    let itemContent = content
    let itemUrl = url
    let metadata: Record<string, unknown> = {}

    // For links, extract metadata
    if (itemType === 'link' && (itemUrl || itemContent)) {
      const linkUrl = itemUrl || itemContent
      metadata = await extractLinkMetadata(linkUrl)
      itemUrl = linkUrl
      itemContent = linkUrl
    }

    // Create the item
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        type: itemType,
        content: itemType === 'text' ? itemContent : null,
        url: itemType === 'link' ? itemUrl : (itemType === 'image' && url ? url : null),
        file_path: file_path || null,
        file_type: file_type || null,
        title: title || (metadata.title as string) || null,
        thumbnail_url: thumbnail_url || (metadata.image as string) || null,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger AI categorization in the background
    categorizeAndUpdate(supabase, item, user.id).catch(console.error)

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error in POST /api/items:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

async function categorizeAndUpdate(
  supabase: { from: (table: string) => any },
  item: { id: string; type: string; content: string | null; url: string | null; metadata: Record<string, unknown> | null },
  userId: string
) {
  try {
    // Check user settings for auto-categorization
    const { data: settings } = await supabase
      .from('user_settings')
      .select('auto_categorize')
      .eq('user_id', userId)
      .single()

    if (settings && settings.auto_categorize === false) {
      return
    }

    const contentToAnalyze = item.type === 'link' ? item.url : item.content
    if (!contentToAnalyze) return

    const result = categorizeContent(
      contentToAnalyze,
      item.type,
      (item.metadata as Record<string, unknown>) || undefined
    )

    // Update item with AI results
    await supabase
      .from('items')
      .update({
        ai_summary: result.summary,
        ai_tags: result.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    // Find or create the AI category
    const { data: category } = await supabase
      .from('ai_categories')
      .select('id')
      .eq('name', result.category)
      .single()

    if (category) {
      // Link item to category (upsert in case of re-categorize)
      await supabase
        .from('item_ai_categories')
        .upsert(
          {
            item_id: item.id,
            category_id: category.id,
            confidence: 0.9,
          },
          { onConflict: ['item_id', 'category_id'] }
        )
    }
  } catch (error) {
    console.error('Error categorizing item:', error)
  }
}
