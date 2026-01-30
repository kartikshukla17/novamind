import { createClient } from '@/lib/supabase/server'
import { ItemCard } from '@/components/ItemCard'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { Sparkles, Tags, ChevronRight } from 'lucide-react'
import type { Item, AICategory } from '@/types'

export default async function CategorizedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all AI categories
  const { data: categories } = await supabase
    .from('ai_categories')
    .select('*')
    .order('name')

  // Fetch all items with their categories
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch item-category relationships
  const { data: itemCategories } = await supabase
    .from('item_ai_categories')
    .select('*')

  // Group items by category
  const categorizedItems: Record<string, Item[]> = {}
  const uncategorizedItems: Item[] = []

  if (items) {
    items.forEach((item: Item) => {
      const itemCats = itemCategories?.filter(ic => ic.item_id === item.id) || []
      if (itemCats.length === 0) {
        uncategorizedItems.push(item)
      } else {
        itemCats.forEach(ic => {
          const category = categories?.find((c: AICategory) => c.id === ic.category_id)
          if (category) {
            if (!categorizedItems[category.name]) {
              categorizedItems[category.name] = []
            }
            categorizedItems[category.name].push(item)
          }
        })
      }
    })
  }

  const hasAnyItems = (items?.length ?? 0) > 0
  const hasCategorized = Object.keys(categorizedItems).length > 0
  const hasUncategorized = uncategorizedItems.length > 0
  const totalCategories = Object.keys(categorizedItems).length

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-display-sm font-bold text-warm-900 dark:text-warm-50">Categorized</h1>
            <p className="text-warm-500 dark:text-warm-400 mt-1">
              Your content organized by AI into {totalCategories} categories
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-800 rounded-xl">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">AI Organized</span>
          </div>
        </div>
      </div>

      {!hasAnyItems ? (
        <EmptyState />
      ) : (
        <div className="space-y-12">
          {/* Show uncategorized first so you always see your items */}
          {hasUncategorized && (
            <CategorySection
              name="Uncategorized"
              items={uncategorizedItems}
              note={hasCategorized ? undefined : 'New items are categorized in the background. Refresh in a moment to see them under a category.'}
            />
          )}
          {Object.entries(categorizedItems).map(([categoryName, categoryItems]) => (
            <CategorySection
              key={categoryName}
              name={categoryName}
              items={categoryItems}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategorySection({ name, items, note }: { name: string; items: Item[]; note?: string }) {
  const colorClass = CATEGORY_COLORS[name] || CATEGORY_COLORS['Other']
  const iconName = CATEGORY_ICONS[name] || 'Folder'
  // @ts-expect-error - Dynamic icon lookup
  const Icon = Icons[iconName] || Icons.Folder

  // Define gradient colors based on category
  const gradients: Record<string, string> = {
    Articles: 'from-blue-500 to-blue-600',
    Design: 'from-pink-500 to-pink-600',
    Recipes: 'from-orange-500 to-orange-600',
    Videos: 'from-red-500 to-red-600',
    Shopping: 'from-emerald-500 to-emerald-600',
    Travel: 'from-cyan-500 to-cyan-600',
    Work: 'from-indigo-500 to-indigo-600',
    Learning: 'from-purple-500 to-purple-600',
    Inspiration: 'from-amber-500 to-amber-600',
    Uncategorized: 'from-warm-400 to-warm-500',
    Other: 'from-warm-500 to-warm-600',
  }

  const gradient = gradients[name] || gradients['Other']

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-soft`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50">{name}</h2>
            <p className="text-sm text-warm-500 dark:text-warm-400">{items.length} items</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          View all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {note && (
        <div className="flex items-center gap-2 p-4 bg-accent-50 dark:bg-accent-950/50 border border-accent-100 dark:border-accent-800 rounded-xl mb-6">
          <Sparkles className="h-4 w-4 text-accent-500 flex-shrink-0" />
          <p className="text-sm text-accent-700 dark:text-accent-300">{note}</p>
        </div>
      )}
      <div className="masonry-grid">
        {items.slice(0, 6).map((item, index) => (
          <div
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <ItemCard item={item} />
          </div>
        ))}
      </div>
      {items.length > 6 && (
        <div className="mt-6 text-center">
          <button className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            Show {items.length - 6} more items
          </button>
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-primary-100 dark:from-emerald-900/50 dark:to-primary-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Tags className="h-10 w-10 text-emerald-500" />
      </div>
      <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">No items to categorize</h2>
      <p className="text-warm-500 dark:text-warm-400 max-w-sm mx-auto mb-6">
        Add some content from All Items and AI will automatically organize it into categories.
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-warm-400 dark:text-warm-500">
        <Sparkles className="h-4 w-4" />
        <span>Categories include Articles, Design, Recipes, Travel, and more</span>
      </div>
    </div>
  )
}
