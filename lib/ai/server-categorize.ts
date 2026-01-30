/**
 * Server-side categorization (no OpenAI / no external API).
 * Used by API routes when creating or categorizing items.
 * Matches DB ai_categories: Articles, Design, Recipes, Videos, Shopping,
 * Travel, Work, Learning, Inspiration, Other.
 */

export interface AICategorizationResult {
  category: string
  tags: string[]
  summary: string
}

const CATEGORIES = [
  'Articles',
  'Design',
  'Recipes',
  'Videos',
  'Shopping',
  'Travel',
  'Work',
  'Learning',
  'Inspiration',
  'Other',
] as const

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Articles: [
    'article', 'blog', 'post', 'read', 'writing', 'medium', 'substack',
    'newsletter', 'essay', 'editorial', 'journal', 'report',
  ],
  Design: [
    'design', 'figma', 'sketch', 'ui', 'ux', 'dribbble', 'behance',
    'css', 'color', 'font', 'typography', 'layout', 'mockup', 'prototype',
  ],
  Recipes: [
    'recipe', 'cooking', 'food', 'ingredient', 'bake', 'kitchen', 'meal',
    'dinner', 'lunch', 'breakfast', 'dish', 'cuisine', 'chef',
  ],
  Videos: [
    'video', 'youtube', 'watch', 'stream', 'movie', 'film', 'episode',
    'tutorial', 'vlog', 'channel', 'playlist',
  ],
  Shopping: [
    'buy', 'price', 'shop', 'amazon', 'product', 'sale', 'discount',
    'cart', 'store', 'deal', 'coupon', 'review',
  ],
  Travel: [
    'travel', 'hotel', 'flight', 'vacation', 'trip', 'destination',
    'booking', 'airbnb', 'traveling', 'itinerary', 'guide',
  ],
  Work: [
    'work', 'meeting', 'project', 'deadline', 'task', 'job', 'career',
    'resume', 'linkedin', 'productivity', 'remote', 'office',
  ],
  Learning: [
    'learn', 'course', 'tutorial', 'education', 'study', 'university',
    'lecture', 'lesson', 'certification', 'training', 'mooc',
  ],
  Inspiration: [
    'inspiration', 'ideas', 'creative', 'motivation', 'quote', 'mindset',
    'pinterest', 'mood', 'board', 'collection',
  ],
  Other: [],
}

const COMMON_TAGS = [
  'tutorial', 'guide', 'reference', 'blog', 'news', 'research', 'tool',
  'product', 'review', 'design', 'recipe', 'travel', 'work', 'learning',
  'inspiration', 'saved', 'bookmark',
]

export function categorizeContent(
  content: string,
  type: string,
  metadata?: Record<string, unknown>
): AICategorizationResult {
  const title = (metadata?.title as string) || ''
  const description = (metadata?.description as string) || ''
  const text = `${title} ${description} ${content}`.toLowerCase()

  let bestCategory: string = 'Other'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue
    const score = keywords.filter((kw) => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  const tags = extractTags(text)
  const summary = extractSummary(content, metadata)

  return {
    category: CATEGORIES.includes(bestCategory as typeof CATEGORIES[number]) ? bestCategory : 'Other',
    tags,
    summary,
  }
}

function extractTags(text: string): string[] {
  const found = COMMON_TAGS.filter((tag) => text.includes(tag)).slice(0, 5)
  return found.length > 0 ? found : ['saved']
}

function extractSummary(
  content: string,
  metadata?: Record<string, unknown>
): string {
  const desc = metadata?.description as string | undefined
  if (desc && typeof desc === 'string') {
    return desc.slice(0, 200).trim()
  }

  const raw = (content || '').trim()
  const sentenceEnd = raw.search(/[.!?]\s/)
  if (sentenceEnd > 20 && sentenceEnd < 200) {
    return raw.slice(0, sentenceEnd + 1)
  }
  if (raw.length > 200) {
    const truncated = raw.slice(0, 197)
    const lastSpace = truncated.lastIndexOf(' ')
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
  }
  return raw || ''
}
