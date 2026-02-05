'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  FileText, Link as LinkIcon, Image as ImageIcon,
  File, MoreHorizontal, Trash2, Plus, ExternalLink, Star, Check, Download, Minus
} from 'lucide-react'
import type { Item, ViewMode } from '@/types'
import { formatRelativeTime, truncate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface ItemCardProps {
  item: Item & { matchReason?: string; relevanceScore?: number }
  viewMode?: ViewMode
  onAddToBoard?: (itemId: string) => void
  onClick?: () => void
  onUpdate?: (item: Item) => void
  onDelete?: (id: string) => void
  onRemoveFromBoard?: (itemId: string) => void
  boardId?: string
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectionMode?: boolean
}

export function ItemCard({
  item,
  viewMode = 'grid',
  onAddToBoard,
  onClick,
  onUpdate,
  onDelete,
  onRemoveFromBoard,
  boardId,
  isSelected,
  onSelect,
  selectionMode,
}: ItemCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const typeIcons = {
    text: FileText,
    link: LinkIcon,
    image: ImageIcon,
    file: File,
  }

  const Icon = typeIcons[item.type] || File

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this item?')) return

    setDeleting(true)
    const { error } = await supabase.from('items').delete().eq('id', item.id)
    if (!error) {
      onDelete?.(item.id)
    }
    setDeleting(false)
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const { data, error } = await supabase
        .from('items')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', item.id)
        .select()
        .single()

      if (error) {
        console.error('Error toggling favorite:', error)
        throw error
      }

      if (data) {
        onUpdate?.(data)
      }
    } catch (error) {
      console.error('Failed to update favorite status:', error)
      alert('Failed to update favorite status. Please try again.')
    }
  }

  function handleSelect(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect?.(item.id, !isSelected)
  }

  function getDisplayContent() {
    if (item.type === 'link') {
      return item.title || item.url || 'Untitled Link'
    }
    if (item.type === 'text') {
      return item.title || truncate(item.content || '', viewMode === 'list' ? 100 : 200)
    }
    return item.title || item.file_path || 'Untitled'
  }

  // Get the file URL for opening/downloading
  function getFileUrl() {
    if (item.thumbnail_url) return item.thumbnail_url
    if (item.file_path) {
      // Generate public URL from Supabase storage
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${item.file_path}`
    }
    return null
  }

  const fileUrl = getFileUrl()

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${deleting ? 'opacity-50 pointer-events-none' : ''
          } ${isSelected ? 'bg-primary-50 dark:bg-sky-900/30' : ''}`}
      >
        <div className="flex items-center gap-4 p-3">
          {/* Selection checkbox */}
          {selectionMode && (
            <button
              onClick={handleSelect}
              className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected
                  ? 'bg-primary-600 dark:bg-sky-500 border-primary-600 dark:border-sky-500'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </button>
          )}

          {/* Favorite */}
          <button
            onClick={handleToggleFavorite}
            className={`p-1 rounded ${item.is_favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'
              }`}
          >
            <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
          </button>

          {/* Type icon */}
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            <Icon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
          </div>

          {/* Thumbnail (small) */}
          {item.thumbnail_url && (
            <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={item.thumbnail_url}
                alt=""
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{getDisplayContent()}</p>
            {item.ai_summary && (
              <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{item.ai_summary}</p>
            )}
          </div>

          {/* Tags */}
          <div className="hidden md:flex items-center gap-1">
            {item.ai_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Date */}
          <span className="text-xs text-gray-400 dark:text-slate-500 w-20 text-right">
            {formatRelativeTime(item.created_at)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {item.type === 'link' && item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                title="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {(item.type === 'file' || item.type === 'image') && fileUrl && (
              <>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  title="Open file"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={fileUrl}
                  download={item.title || 'download'}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 overflow-hidden hover:shadow-md dark:hover:shadow-warm-900/50 transition-all cursor-pointer animate-fade-in ${deleting ? 'opacity-50 pointer-events-none' : ''
        } ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
    >
      {/* Selection indicator */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={handleSelect}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm ${isSelected
                ? 'bg-primary-600 dark:bg-sky-500 border-primary-600 dark:border-sky-500'
                : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
              }`}
          >
            {isSelected && <Check className="h-4 w-4 text-white" />}
          </button>
        </div>
      )}

      {/* Favorite button */}
      <button
        onClick={handleToggleFavorite}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full shadow-sm ${item.is_favorite
            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 dark:text-yellow-400'
            : 'bg-white/80 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100'
          }`}
      >
        <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
      </button>

      {/* Thumbnail */}
      {item.thumbnail_url && (
        <div className="relative aspect-video bg-gray-100">
          <Image
            src={item.thumbnail_url}
            alt={item.title || 'Item thumbnail'}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 group relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
            <Icon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">{item.type}</span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                  }}
                />
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-20 max-h-64 overflow-y-auto">
                  {onAddToBoard && !boardId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToBoard(item.id)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Board
                    </button>
                  )}
                  {boardId && onRemoveFromBoard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveFromBoard(item.id)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-left"
                    >
                      <Minus className="h-4 w-4" />
                      Remove from Board
                    </button>
                  )}
                  {item.type === 'link' && item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Link
                    </a>
                  )}
                  {(item.type === 'file' || item.type === 'image') && fileUrl && (
                    <>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open File
                      </a>
                      <a
                        href={fileUrl}
                        download={item.title || 'download'}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </>
                  )}
                  <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(e)
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title / Content */}
        <p className="text-gray-900 dark:text-white font-medium mb-2 line-clamp-3">
          {getDisplayContent()}
        </p>

        {/* AI Summary */}
        {item.ai_summary && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">
            {item.ai_summary}
          </p>
        )}

        {/* Tags */}
        {(item.ai_tags?.length || item.custom_tags?.length) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.ai_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"
              >
                {tag}
              </span>
            ))}
            {item.custom_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {formatRelativeTime(item.created_at)}
        </p>

        {/* Search Match Reason */}
        {item.matchReason && (
          <div className="mt-2 pt-2 border-t border-warm-100 dark:border-warm-700">
            <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
              <span className="font-medium">Match:</span> {item.matchReason}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
