export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(date)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

export function detectContentType(content: string): 'text' | 'link' {
  if (isValidUrl(content)) return 'link'
  return 'text'
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function generateUniqueFilename(originalName: string): string {
  const extension = getFileExtension(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}.${extension}`
}

export const CATEGORY_COLORS: Record<string, string> = {
  Articles: 'bg-blue-100 text-blue-800',
  Design: 'bg-purple-100 text-purple-800',
  Recipes: 'bg-orange-100 text-orange-800',
  Videos: 'bg-red-100 text-red-800',
  Shopping: 'bg-green-100 text-green-800',
  Travel: 'bg-teal-100 text-teal-800',
  Work: 'bg-gray-100 text-gray-800',
  Learning: 'bg-yellow-100 text-yellow-800',
  Inspiration: 'bg-pink-100 text-pink-800',
  Other: 'bg-slate-100 text-slate-800',
}

export const CATEGORY_ICONS: Record<string, string> = {
  Articles: 'FileText',
  Design: 'Palette',
  Recipes: 'ChefHat',
  Videos: 'Video',
  Shopping: 'ShoppingBag',
  Travel: 'Plane',
  Work: 'Briefcase',
  Learning: 'GraduationCap',
  Inspiration: 'Lightbulb',
  Other: 'Folder',
}

export const BOARD_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]
