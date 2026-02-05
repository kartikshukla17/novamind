'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Star,
  Trash2,
  ExternalLink,
  Calendar,
  Tag,
  Edit2,
  Save,
  Loader2,
  FolderPlus,
  Copy,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatRelativeTime, CATEGORY_COLORS } from '@/lib/utils'
import type { Item } from '@/types'

interface ItemDetailsModalProps {
  item: Item
  onClose: () => void
  onUpdate: (item: Item) => void
  onDelete: (id: string) => void
}

export function ItemDetailsModal({ item, onClose, onUpdate, onDelete }: ItemDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedItem, setEditedItem] = useState(item)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newTag, setNewTag] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Update view count
    supabase
      .from('items')
      .update({
        view_count: (item.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .then()

    // Handle escape key
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [item.id, supabase, onClose])

  async function handleSave() {
    setSaving(true)

    const { data, error } = await supabase
      .from('items')
      .update({
        title: editedItem.title,
        content: editedItem.content,
        custom_tags: editedItem.custom_tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .select()
      .single()

    if (!error && data) {
      onUpdate(data)
      setIsEditing(false)
    }
    setSaving(false)
  }

  async function handleToggleFavorite() {
    const newValue = !editedItem.is_favorite
    setEditedItem({ ...editedItem, is_favorite: newValue })

    try {
      const { data, error } = await supabase
        .from('items')
        .update({ is_favorite: newValue })
        .eq('id', item.id)
        .select()
        .single()

      if (error) {
        // Revert optimistic update
        setEditedItem({ ...editedItem, is_favorite: !newValue })
        console.error('Error toggling favorite:', error)
        throw error
      }

      if (data) onUpdate(data)
    } catch (error) {
      console.error('Failed to update favorite status:', error)
      alert('Failed to update favorite status. Please try again.')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this item?')) return

    setDeleting(true)
    const { error } = await supabase.from('items').delete().eq('id', item.id)

    if (!error) {
      onDelete(item.id)
      onClose()
    }
    setDeleting(false)
  }

  function addTag() {
    if (!newTag.trim()) return
    const tags = [...(editedItem.custom_tags || []), newTag.trim().toLowerCase()]
    setEditedItem({ ...editedItem, custom_tags: tags })
    setNewTag('')
  }

  function removeTag(tag: string) {
    const tags = (editedItem.custom_tags || []).filter((t) => t !== tag)
    setEditedItem({ ...editedItem, custom_tags: tags })
  }

  async function copyContent() {
    const content = item.type === 'link' ? item.url : item.content
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 capitalize">
              {item.type}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {formatRelativeTime(item.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${editedItem.is_favorite
                  ? 'text-yellow-500 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              title={editedItem.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`h-5 w-5 ${editedItem.is_favorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={copyContent}
              className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Copy content"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-500 dark:text-green-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg transition-colors ${isEditing ? 'text-primary-600 dark:text-sky-400 bg-primary-50 dark:bg-sky-900/30' : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              title="Edit"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Delete"
            >
              {deleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={editedItem.title || ''}
              onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
              placeholder="Title"
              className="w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-slate-600 pb-2 focus:outline-none focus:border-primary-500 dark:focus:border-sky-500"
            />
          ) : (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {item.title || 'Untitled'}
            </h2>
          )}

          {/* Thumbnail for images/links */}
          {item.thumbnail_url && (
            <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
              <img
                src={item.thumbnail_url}
                alt={item.title || ''}
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}

          {/* URL for links */}
          {item.type === 'link' && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-600 dark:text-sky-400 hover:text-primary-700 dark:hover:text-sky-300 text-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {item.url}
            </a>
          )}

          {/* Content */}
          {item.type === 'text' && (
            isEditing ? (
              <textarea
                value={editedItem.content || ''}
                onChange={(e) => setEditedItem({ ...editedItem, content: e.target.value })}
                rows={8}
                className="w-full p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-slate-300">{item.content}</p>
              </div>
            )
          )}

          {/* AI Summary */}
          {item.ai_summary && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">AI Summary</span>
              <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">{item.ai_summary}</p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            {/* AI Tags */}
            {item.ai_tags && item.ai_tags.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">AI Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.ai_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Tags */}
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Custom Tags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(editedItem.custom_tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1"
                  >
                    {tag}
                    {isEditing && (
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-green-900 dark:hover:text-green-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      placeholder="Add tag..."
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-full w-24 focus:outline-none focus:border-primary-500 dark:focus:border-sky-500"
                    />
                    <button
                      onClick={addTag}
                      className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      <Tag className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Created {formatDate(item.created_at)}
            </div>
            {item.view_count > 0 && (
              <div>Viewed {item.view_count} times</div>
            )}
          </div>
        </div>

        {/* Footer - Save button when editing */}
        {isEditing && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditedItem(item)
                setIsEditing(false)
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 dark:bg-sky-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-sky-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
