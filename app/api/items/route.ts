import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { extractLinkMetadata } from '@/lib/utils/link-metadata'
import { categorizeContent } from '@/lib/ai/server-categorize'
import { generateImageDescription } from '@/lib/ai/semantic-search'
import { enforceItemLimit } from '@/lib/subscription/feature-gate'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'

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
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'items/create')
  if (!rateLimit.allowed) return rateLimit.response!

  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check item limit
  const limitCheck = await enforceItemLimit(user.id)
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.error?.message,
      code: limitCheck.error?.code,
      currentCount: limitCheck.error?.currentCount,
      limit: limitCheck.error?.limit,
      upgradeRequired: true,
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { type, content, url, title, file_path, file_type, thumbnail_url, ai_description } = body

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

    // Build insert object
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      type: itemType,
      content: itemType === 'text' ? itemContent : null,
      url: itemType === 'link' ? itemUrl : (itemType === 'image' && url ? url : null),
      file_path: file_path || null,
      file_type: file_type || null,
      title: title || (metadata.title as string) || null,
      thumbnail_url: thumbnail_url || (metadata.image as string) || null,
      metadata,
    }

    // If we have AI description, use it as the summary (which definitely exists)
    if (ai_description) {
      insertData.ai_summary = ai_description.slice(0, 500)
      // Add tags based on the description
      insertData.ai_tags = extractTagsFromDescription(ai_description)
    }

    // Create the item
    const { data: item, error } = await supabase
      .from('items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger AI categorization in the background
    categorizeAndUpdate(supabase, {
      ...item,
      thumbnail_url: item.thumbnail_url || thumbnail_url || null,
      file_path: item.file_path || file_path || null,
      title: item.title || title || null,
    }, user.id).catch(console.error)

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error in POST /api/items:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

async function categorizeAndUpdate(
  supabase: { from: (table: string) => any },
  item: { id: string; type: string; content: string | null; url: string | null; thumbnail_url: string | null; file_path: string | null; title: string | null; metadata: Record<string, unknown> | null },
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
    
    // Generate description for images (local processing - no API calls)
    let aiDescription: string | null = null
    if (item.type === 'image') {
      // Use filename and metadata for description
      const filename = item.file_path || item.title || item.thumbnail_url
      aiDescription = generateImageDescription(filename, item.metadata)
    }

    // Categorize content (use image description if available)
    const textToAnalyze = aiDescription || contentToAnalyze || ''
    if (!textToAnalyze && !aiDescription) return

    const result = categorizeContent(
      textToAnalyze,
      item.type,
      (item.metadata as Record<string, unknown>) || undefined
    )

    // Update item with AI results
    await supabase
      .from('items')
      .update({
        ai_summary: result.summary || aiDescription?.slice(0, 200),
        ai_tags: result.tags,
        ai_description: aiDescription,
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

/**
 * Extract relevant tags from an AI-generated image description
 */
function extractTagsFromDescription(description: string): string[] {
  const text = description.toLowerCase()
  
  // Common visual elements and concepts to tag
  const tagKeywords: Record<string, string[]> = {
    'nature': ['tree', 'forest', 'mountain', 'ocean', 'beach', 'sky', 'sunset', 'sunrise', 'flower', 'plant', 'garden', 'landscape'],
    'people': ['person', 'man', 'woman', 'child', 'people', 'face', 'portrait', 'group'],
    'animal': ['dog', 'cat', 'bird', 'animal', 'pet', 'wildlife'],
    'food': ['food', 'meal', 'dish', 'restaurant', 'cooking', 'plate', 'fruit', 'vegetable'],
    'technology': ['computer', 'phone', 'screen', 'laptop', 'device', 'technology', 'code'],
    'building': ['building', 'house', 'architecture', 'city', 'street', 'room', 'interior'],
    'art': ['art', 'painting', 'drawing', 'design', 'illustration', 'colorful'],
    'text': ['text', 'sign', 'writing', 'document', 'book', 'letter'],
    'vehicle': ['car', 'vehicle', 'road', 'transport', 'bike', 'airplane'],
    'sports': ['sport', 'ball', 'game', 'player', 'team', 'fitness'],
  }
  
  const foundTags: string[] = []
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      foundTags.push(tag)
    }
  }
  
  // Also extract specific nouns from the description
  const words = text.split(/\s+/)
  const importantWords = words.filter(w => 
    w.length > 4 && 
    !['with', 'that', 'this', 'from', 'have', 'been', 'being', 'there', 'their', 'which', 'would', 'could', 'should'].includes(w)
  ).slice(0, 3)
  
  return [...new Set([...foundTags, ...importantWords])].slice(0, 5)
}
