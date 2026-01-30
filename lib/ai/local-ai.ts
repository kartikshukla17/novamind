/**
 * Local AI Service using Transformers.js
 * Runs entirely in the browser - zero server costs
 */

// Only import on client side
const isBrowser = typeof window !== 'undefined'

// Types for Transformers.js - we'll use dynamic imports
type Pipeline = (text: string, labels?: string[]) => Promise<{
  labels: string[]
  scores: number[]
}>

type SummarizationPipeline = (text: string, options?: { max_length: number; min_length: number }) => Promise<{ summary_text: string }[]>

interface AIResult {
  category: string
  tags: string[]
  summary: string
}

// Model loading state
let classifierPipeline: Pipeline | null = null
let summarizerPipeline: SummarizationPipeline | null = null
let isLoading = false
let loadingProgress = 0

// Available categories for classification
const CATEGORIES = [
  'Articles',
  'Design',
  'Recipes',
  'Shopping',
  'Travel',
  'Work',
  'Learning',
  'Videos',
  'Social Media',
  'News',
  'Technology',
  'Entertainment',
  'Health',
  'Finance',
  'Other'
]

// Common tags for classification
const COMMON_TAGS = [
  'tutorial', 'guide', 'reference', 'documentation',
  'blog', 'news', 'research', 'tool', 'resource',
  'product', 'review', 'comparison', 'list',
  'video', 'image', 'code', 'design', 'template',
  'recipe', 'travel', 'health', 'finance', 'tech',
  'entertainment', 'social', 'work', 'personal'
]

/**
 * Get current loading progress (0-100)
 */
export function getLoadingProgress(): number {
  return loadingProgress
}

/**
 * Check if AI models are loaded
 */
export function isAIReady(): boolean {
  return classifierPipeline !== null
}

/**
 * Check if AI is currently loading
 */
export function isAILoading(): boolean {
  return isLoading
}

/**
 * Initialize AI models (downloads on first use, then cached)
 */
export async function initializeAI(
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  // Only run in browser
  if (!isBrowser) {
    console.log('AI initialization skipped - not in browser')
    return
  }

  if (classifierPipeline || isLoading) return

  isLoading = true
  loadingProgress = 0

  try {
    // Dynamic import to avoid SSR issues
    const { pipeline, env } = await import('@xenova/transformers')

    // Disable local model check to always use CDN
    env.allowLocalModels = false
    // Use web backend only
    env.backends.onnx.wasm.numThreads = 1

    onProgress?.(10, 'Loading AI models...')
    loadingProgress = 10

    // Load zero-shot classification model (for categories and tags)
    // Using a smaller, faster model that works well in browser
    classifierPipeline = await pipeline(
      'zero-shot-classification',
      'Xenova/mobilebert-uncased-mnli',
      {
        progress_callback: (data: { progress?: number; status?: string }) => {
          if (data.progress) {
            const progress = 10 + (data.progress * 0.6) // 10-70%
            loadingProgress = progress
            onProgress?.(progress, data.status || 'Downloading classifier...')
          }
        }
      }
    ) as unknown as Pipeline

    onProgress?.(70, 'Classifier ready')
    loadingProgress = 70

    // For summarization, we'll use a rule-based approach to keep bundle small
    // Full summarization model adds ~250MB which is too heavy for browser

    onProgress?.(100, 'AI ready!')
    loadingProgress = 100

  } catch (error) {
    console.error('Failed to initialize AI:', error)
    throw error
  } finally {
    isLoading = false
  }
}

/**
 * Categorize content using local AI
 */
export async function categorizeContent(
  content: string,
  type: 'text' | 'link' | 'image' | 'file',
  metadata?: { title?: string; description?: string }
): Promise<AIResult> {
  // If AI not loaded, use fallback
  if (!classifierPipeline) {
    return fallbackCategorize(content, type, metadata)
  }

  try {
    // Prepare text for classification
    const textToAnalyze = prepareTextForAnalysis(content, type, metadata)

    // Classify category
    const categoryResult = await classifierPipeline(textToAnalyze, CATEGORIES)
    const category = categoryResult.labels[0] || 'Other'

    // Classify tags (top 3)
    const tagResult = await classifierPipeline(textToAnalyze, COMMON_TAGS)
    const tags = tagResult.labels.slice(0, 3)

    // Generate summary using rule-based extraction
    const summary = extractSummary(content, metadata)

    return { category, tags, summary }

  } catch (error) {
    console.error('AI categorization failed:', error)
    return fallbackCategorize(content, type, metadata)
  }
}

/**
 * Prepare text for AI analysis
 */
function prepareTextForAnalysis(
  content: string,
  type: string,
  metadata?: { title?: string; description?: string }
): string {
  const parts: string[] = []

  if (metadata?.title) {
    parts.push(metadata.title)
  }

  if (metadata?.description) {
    parts.push(metadata.description)
  }

  // For links, add the URL
  if (type === 'link') {
    parts.push(content)
  } else {
    // For text, take first 500 chars
    parts.push(content.slice(0, 500))
  }

  return parts.join('. ')
}

/**
 * Extract summary using rule-based approach (no heavy model needed)
 */
function extractSummary(
  content: string,
  metadata?: { title?: string; description?: string }
): string {
  // If we have a description from metadata, use that
  if (metadata?.description) {
    return metadata.description.slice(0, 200)
  }

  // Otherwise, extract first sentence or chunk
  const text = content.trim()

  // Find first sentence
  const sentenceEnd = text.search(/[.!?]\s/)
  if (sentenceEnd > 20 && sentenceEnd < 200) {
    return text.slice(0, sentenceEnd + 1)
  }

  // Fall back to truncation
  if (text.length > 200) {
    const truncated = text.slice(0, 197)
    const lastSpace = truncated.lastIndexOf(' ')
    return truncated.slice(0, lastSpace) + '...'
  }

  return text
}

/**
 * Fallback categorization using keyword matching
 * Used when AI models fail or aren't loaded
 */
function fallbackCategorize(
  content: string,
  type: string,
  metadata?: { title?: string; description?: string }
): AIResult {
  const text = `${metadata?.title || ''} ${metadata?.description || ''} ${content}`.toLowerCase()

  // Category keywords
  const categoryKeywords: Record<string, string[]> = {
    'Design': ['design', 'figma', 'sketch', 'ui', 'ux', 'dribbble', 'behance', 'css', 'color', 'font', 'typography'],
    'Technology': ['code', 'programming', 'javascript', 'python', 'react', 'github', 'api', 'developer', 'software', 'tech'],
    'Learning': ['learn', 'course', 'tutorial', 'education', 'study', 'university', 'lecture', 'lesson'],
    'Recipes': ['recipe', 'cooking', 'food', 'ingredient', 'bake', 'kitchen', 'meal', 'dinner'],
    'Shopping': ['buy', 'price', 'shop', 'amazon', 'product', 'sale', 'discount', 'cart'],
    'Travel': ['travel', 'hotel', 'flight', 'vacation', 'trip', 'destination', 'booking', 'airbnb'],
    'News': ['news', 'breaking', 'report', 'latest', 'update', 'headline'],
    'Videos': ['video', 'youtube', 'watch', 'stream', 'movie', 'film', 'episode'],
    'Work': ['work', 'meeting', 'project', 'deadline', 'task', 'job', 'career', 'resume'],
    'Health': ['health', 'fitness', 'exercise', 'diet', 'medical', 'doctor', 'wellness'],
    'Finance': ['money', 'finance', 'invest', 'stock', 'bank', 'budget', 'crypto'],
    'Entertainment': ['game', 'music', 'fun', 'play', 'entertainment', 'spotify'],
  }

  let bestCategory = 'Other'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(kw => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  // Extract tags from content
  const foundTags = COMMON_TAGS.filter(tag => text.includes(tag)).slice(0, 3)
  const tags = foundTags.length > 0 ? foundTags : ['saved', type]

  return {
    category: bestCategory,
    tags,
    summary: extractSummary(content, metadata)
  }
}

/**
 * Batch categorize multiple items (more efficient)
 */
export async function batchCategorize(
  items: Array<{ content: string; type: 'text' | 'link' | 'image' | 'file'; metadata?: { title?: string; description?: string } }>
): Promise<AIResult[]> {
  const results: AIResult[] = []

  for (const item of items) {
    const result = await categorizeContent(item.content, item.type, item.metadata)
    results.push(result)
  }

  return results
}
