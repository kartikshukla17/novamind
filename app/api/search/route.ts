import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { parseSearchQuery, scoreItemRelevance, type SearchableItem } from '@/lib/ai/semantic-search'

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], query: '', parsed: null })
  }

  try {
    // Parse the search query to understand intent (local processing)
    const parsed = parseSearchQuery(query)
    
    // Build the database query (ai_description is optional - may not exist in older schemas)
    let itemsQuery = supabase
      .from('items')
      .select('id, type, title, content, url, ai_summary, ai_tags, metadata, created_at, thumbnail_url, file_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by item type if detected
    if (parsed.itemType) {
      itemsQuery = itemsQuery.eq('type', parsed.itemType)
    }

    // Filter by timeframe if detected
    if (parsed.timeframe) {
      const now = new Date()
      let startDate: Date

      switch (parsed.timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          itemsQuery = itemsQuery.lt('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
          break
        case 'this_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }
      
      if (parsed.timeframe !== 'yesterday') {
        itemsQuery = itemsQuery.gte('created_at', startDate.toISOString())
      }
    }

    // Fetch items (we'll filter and score in memory for better semantic matching)
    const { data: items, error } = await itemsQuery.limit(200)

    if (error) {
      console.error('Search query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        results: [],
        query,
        parsed,
        totalMatches: 0,
      })
    }

    // Score and rank results using local semantic matching
    const results = (items as SearchableItem[]).map(item => {
      const { score, reason } = scoreItemRelevance(
        item,
        parsed.searchTerms,
        parsed.description,
        parsed.itemType
      )
      return {
        ...item,
        relevanceScore: score,
        matchReason: reason,
      }
    })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    return NextResponse.json({
      results: results.slice(0, 50),
      query,
      parsed,
      totalMatches: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // POST method for more complex search with body
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { query, filters } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [], query: '', parsed: null })
    }

    // Parse the search query (local processing)
    const parsed = parseSearchQuery(query)

    // Build query with optional filters
    let itemsQuery = supabase
      .from('items')
      .select('id, type, title, content, url, ai_summary, ai_tags, metadata, created_at, thumbnail_url, file_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply type filter from parsed query or explicit filter
    const typeFilter = filters?.type || parsed.itemType
    if (typeFilter) {
      itemsQuery = itemsQuery.eq('type', typeFilter)
    }

    // Apply date filter
    if (filters?.dateFrom) {
      itemsQuery = itemsQuery.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      itemsQuery = itemsQuery.lte('created_at', filters.dateTo)
    }

    const { data: items, error } = await itemsQuery.limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ results: [], query, parsed, totalMatches: 0 })
    }

    // Score and rank using local semantic matching
    const results = (items as SearchableItem[]).map(item => {
      const { score, reason } = scoreItemRelevance(
        item,
        parsed.searchTerms,
        parsed.description,
        parsed.itemType
      )
      return {
        ...item,
        relevanceScore: score,
        matchReason: reason,
      }
    })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    return NextResponse.json({
      results: results.slice(0, 50),
      query,
      parsed,
      totalMatches: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
