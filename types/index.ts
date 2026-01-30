export type ItemType = 'text' | 'link' | 'image' | 'file'

export interface Item {
  id: string
  user_id: string
  type: ItemType
  content: string | null
  url: string | null
  file_path: string | null
  file_type: string | null
  title: string | null
  thumbnail_url: string | null
  metadata: Record<string, unknown> | null
  ai_summary: string | null
  ai_tags: string[] | null
  ai_description: string | null // Detailed description for semantic search
  custom_tags: string[] | null
  is_favorite: boolean
  is_archived: boolean
  view_count: number
  last_viewed_at: string | null
  created_at: string
  updated_at: string
}

export interface SavedSearch {
  id: string
  user_id: string
  name: string
  query: string | null
  filters: SearchFilters
  created_at: string
}

export interface RecentSearch {
  id: string
  user_id: string
  query: string
  searched_at: string
}

export interface SearchFilters {
  type?: ItemType | null
  dateFrom?: string | null
  dateTo?: string | null
  tags?: string[]
  category?: string | null
  isFavorite?: boolean
  boardId?: string | null
}

export type SortOption = 'created_at' | 'updated_at' | 'title' | 'type'
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'grid' | 'list'

export interface Board {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  is_ai_generated: boolean
  created_at: string
}

export interface ItemBoard {
  item_id: string
  board_id: string
  added_at: string
}

export interface AICategory {
  id: string
  name: string
  icon: string | null
}

export interface ItemAICategory {
  item_id: string
  category_id: string
  confidence: number | null
}

export interface UserSettings {
  user_id: string
  clipboard_monitoring: boolean
  auto_categorize: boolean
  theme: 'light' | 'dark'
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface CreateItemPayload {
  type: ItemType
  content?: string
  url?: string
  title?: string
  file?: File
}

export interface AICategorizationResult {
  category: string
  tags: string[]
  summary: string
}

export interface LinkMetadata {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

// Subscription types
export type SubscriptionTier = 'free' | 'pro'

export type SubscriptionStatus = 'inactive' | 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired'

export interface Subscription {
  id: string
  user_id: string
  razorpay_subscription_id: string | null
  razorpay_customer_id: string | null
  razorpay_plan_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  cancel_at_period_end: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  subscription_id: string | null
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'
  method: string | null
  error_code: string | null
  error_description: string | null
  created_at: string
}

export interface Plan {
  id: string
  razorpay_plan_id: string | null
  name: string
  amount: number
  currency: string
  interval: string
  features: string[]
  is_active: boolean
  created_at: string
}

export interface FeatureLimits {
  maxItems: number
  maxBoards: number
  hasExtensionAccess: boolean
  hasAdvancedAI: boolean
  hasPrioritySupport: boolean
  hasExportData: boolean
}
