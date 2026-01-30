/**
 * Local semantic search for Novamind
 * Uses rule-based natural language parsing and keyword matching
 * No external API calls - runs entirely on the server
 */

export interface SearchableItem {
  id: string
  type: string
  title: string | null
  content: string | null
  url: string | null
  ai_summary: string | null
  ai_tags: string[] | null
  ai_description?: string | null  // Optional - may not exist in DB
  file_path?: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SemanticSearchResult {
  item: SearchableItem
  relevanceScore: number
  matchReason: string
}

// Keywords that indicate item types
const TYPE_KEYWORDS: Record<string, string[]> = {
  image: ['image', 'photo', 'picture', 'screenshot', 'snap', 'pic', 'visual', 'graphic'],
  link: ['link', 'url', 'website', 'article', 'page', 'site', 'web', 'blog', 'post'],
  text: ['note', 'text', 'written', 'typed', 'memo', 'wrote', 'content'],
  file: ['file', 'document', 'pdf', 'doc', 'attachment', 'download'],
}

// Keywords that indicate time frames
const TIME_KEYWORDS: Record<string, string[]> = {
  today: ['today', 'just now', 'now', 'just', 'recently'],
  yesterday: ['yesterday'],
  this_week: ['this week', 'week', 'past week', 'last few days', 'few days'],
  this_month: ['this month', 'month', 'recent', 'lately'],
}

// Common description patterns for finding items
const DESCRIPTION_PATTERNS = [
  /(?:about|with|containing|has|having|shows?|showing)\s+(.+)/i,
  /(?:that|which)\s+(?:was|is|has|had|shows?)\s+(.+)/i,
  /(?:something|thing)\s+(?:like|about|with)\s+(.+)/i,
  /(?:the\s+one\s+(?:with|about|that))\s+(.+)/i,
]

// Words to remove from search (stop words)
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as',
  'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
  'find', 'search', 'looking', 'look', 'want', 'need', 'saved', 'save',
  'something', 'thing', 'stuff', 'like', 'one', 'ones',
])

/**
 * Parse a natural language search query to understand what the user is looking for
 */
export function parseSearchQuery(query: string): {
  searchTerms: string[]
  itemType: string | null
  timeframe: string | null
  description: string | null
  intent: string
} {
  const lowerQuery = query.toLowerCase().trim()
  
  // Detect item type
  let itemType: string | null = null
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      itemType = type
      break
    }
  }

  // Detect timeframe
  let timeframe: string | null = null
  for (const [time, keywords] of Object.entries(TIME_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      timeframe = time
      break
    }
  }

  // Extract description from patterns
  let description: string | null = null
  for (const pattern of DESCRIPTION_PATTERNS) {
    const match = lowerQuery.match(pattern)
    if (match && match[1]) {
      description = match[1].trim()
      break
    }
  }

  // Extract search terms (remove stop words and type/time keywords)
  const allTypeKeywords = Object.values(TYPE_KEYWORDS).flat()
  const allTimeKeywords = Object.values(TIME_KEYWORDS).flat()
  
  let terms = lowerQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !STOP_WORDS.has(word) &&
      !allTypeKeywords.includes(word) &&
      !allTimeKeywords.some(tk => tk.includes(word))
    )

  // Always include the raw query as a search term if it's a single word (e.g. "sun", "dog")
  // so image content search works even for short terms
  const singleWord = lowerQuery.replace(/[^\w]/g, '').trim()
  if (singleWord.length >= 2 && singleWord.length <= 20 && !terms.includes(singleWord)) {
    terms = [singleWord, ...terms]
  }

  // Build intent summary
  let intent = ''
  if (itemType) intent += `${itemType} `
  if (description) intent += description
  else if (terms.length > 0) intent += terms.join(' ')
  else intent = query

  const searchTerms = terms.length > 0 ? [...new Set(terms)] : extractKeywords(query)

  return {
    searchTerms,
    itemType,
    timeframe,
    description: description || (searchTerms.length > 0 ? searchTerms.join(' ') : null),
    intent: intent.trim() || query,
  }
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 10)
}

/**
 * Score how well an item matches the search criteria
 */
export function scoreItemRelevance(
  item: SearchableItem,
  searchTerms: string[],
  description: string | null,
  itemType: string | null
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // Type match bonus
  if (itemType && item.type === itemType) {
    score += 20
    reasons.push(`Type: ${itemType}`)
  }

  // Combine all searchable text
  const searchableFields = {
    title: item.title?.toLowerCase() || '',
    content: item.content?.toLowerCase() || '',
    summary: item.ai_summary?.toLowerCase() || '',
    description: item.ai_description?.toLowerCase() || '',
    filePath: item.file_path?.toLowerCase() || '',
    tags: (item.ai_tags || []).join(' ').toLowerCase(),
    url: item.url?.toLowerCase() || '',
    metaTitle: ((item.metadata?.title as string) || '').toLowerCase(),
    metaDesc: ((item.metadata?.description as string) || '').toLowerCase(),
  }

  const allText = Object.values(searchableFields).join(' ')

  // Score each search term
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase()
    
    // Exact match in title (highest value)
    if (searchableFields.title.includes(lowerTerm)) {
      score += 30
      if (!reasons.includes('Title match')) reasons.push('Title match')
    }
    
    // Match in AI description (for images)
    if (searchableFields.description.includes(lowerTerm)) {
      score += 25
      if (!reasons.includes('Description match')) reasons.push('Description match')
    }
    
    // Match in AI summary
    if (searchableFields.summary.includes(lowerTerm)) {
      score += 20
      if (!reasons.includes('Summary match')) reasons.push('Summary match')
    }
    
    // Match in tags
    if (searchableFields.tags.includes(lowerTerm)) {
      score += 15
      if (!reasons.includes('Tag match')) reasons.push('Tag match')
    }
    
    // Match in content
    if (searchableFields.content.includes(lowerTerm)) {
      score += 10
      if (!reasons.includes('Content match')) reasons.push('Content match')
    }
    
    // Match in URL
    if (searchableFields.url.includes(lowerTerm)) {
      score += 10
      if (!reasons.includes('URL match')) reasons.push('URL match')
    }

    // Match in file path (for images/files)
    if (searchableFields.filePath.includes(lowerTerm)) {
      score += 15
      if (!reasons.includes('Filename match')) reasons.push('Filename match')
    }

    // Match in metadata
    if (searchableFields.metaTitle.includes(lowerTerm) || searchableFields.metaDesc.includes(lowerTerm)) {
      score += 8
      if (!reasons.includes('Metadata match')) reasons.push('Metadata match')
    }

    // Fuzzy/partial match bonus
    if (allText.includes(lowerTerm)) {
      score += 3
    }
  }

  // Word proximity bonus - if multiple terms appear close together
  if (searchTerms.length > 1) {
    const termsFound = searchTerms.filter(t => allText.includes(t.toLowerCase()))
    if (termsFound.length === searchTerms.length) {
      score += 10 // All terms found
      if (!reasons.includes('All terms found')) reasons.push('All terms found')
    }
  }

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join(', ') : 'Partial match',
  }
}

/**
 * Generate a description for an image based on filename and metadata
 * (Local processing - no API calls)
 */
export function generateImageDescription(
  filename: string | null,
  metadata: Record<string, unknown> | null
): string | null {
  const parts: string[] = []
  
  // Extract info from filename
  if (filename) {
    // Remove extension and clean up
    const cleanName = filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\d{10,}/g, '') // Remove timestamps
      .trim()
    
    if (cleanName.length > 3) {
      parts.push(cleanName)
    }

    // Detect common screenshot patterns
    if (filename.toLowerCase().includes('screenshot')) {
      parts.push('screenshot')
    }
    if (filename.toLowerCase().includes('screen shot')) {
      parts.push('screen capture')
    }
  }

  // Add metadata info
  if (metadata?.title) {
    parts.push(String(metadata.title))
  }
  if (metadata?.description) {
    parts.push(String(metadata.description))
  }

  return parts.length > 0 ? parts.join(' - ') : null
}

/**
 * Rank search results by relevance
 */
export function rankResults(
  query: string,
  items: SearchableItem[]
): SemanticSearchResult[] {
  const parsed = parseSearchQuery(query)
  
  const results = items.map(item => {
    const { score, reason } = scoreItemRelevance(
      item,
      parsed.searchTerms,
      parsed.description,
      parsed.itemType
    )
    return { item, relevanceScore: score, matchReason: reason }
  })

  // Sort by score descending
  return results
    .filter(r => r.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Suggest search terms based on user input
 */
export function getSuggestedSearches(items: SearchableItem[]): string[] {
  const suggestions: Map<string, number> = new Map()

  for (const item of items) {
    // Add tags as suggestions
    for (const tag of item.ai_tags || []) {
      suggestions.set(tag, (suggestions.get(tag) || 0) + 1)
    }
    
    // Add types as suggestions
    suggestions.set(`all ${item.type}s`, (suggestions.get(`all ${item.type}s`) || 0) + 1)
  }

  // Sort by frequency and return top suggestions
  return Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term)
}
