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
