'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, FileText, Link as LinkIcon, Image as ImageIcon,
  Upload, Loader2, Sparkles
} from 'lucide-react'
import { cn, isValidUrl, detectContentType } from '@/lib/utils'
import { describeImage, isImageCaptionReady, isImageCaptionLoading } from '@/lib/ai/local-ai'

interface UploadModalProps {
  onClose: () => void
  onSuccess?: () => void
}

type InputType = 'text' | 'link' | 'file'

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [inputType, setInputType] = useState<InputType>('text')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setAiStatus(null)

    try {
      let payload: FormData | Record<string, unknown>

      if (inputType === 'file' && file) {
        const formData = new FormData()
        formData.append('file', file)
        if (title) formData.append('title', title)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file')
        }

        const uploadData = await uploadRes.json()

        // Generate AI description for images
        let aiDescription: string | null = null
        if (uploadData.isImage && file) {
          try {
            setAiStatus('Analyzing image with AI...')
            aiDescription = await describeImage(file, (progress, status) => {
              setAiStatus(status || `Loading AI model... ${Math.round(progress)}%`)
            })
            if (aiDescription) {
              console.log('Generated image description:', aiDescription)
            }
          } catch (err) {
            console.warn('Image description failed, continuing without:', err)
          }
          setAiStatus(null)
        }

        payload = {
          type: uploadData.isImage ? 'image' : 'file',
          file_path: uploadData.path,
          file_type: uploadData.mimeType,
          title: title || file.name,
          thumbnail_url: uploadData.isImage ? uploadData.publicUrl : null,
          ai_description: aiDescription,
        }
      } else {
        const detectedType = detectContentType(content)
        payload = {
          type: inputType === 'link' || detectedType === 'link' ? 'link' : 'text',
          content: inputType === 'text' ? content : undefined,
          url: inputType === 'link' || detectedType === 'link' ? content : undefined,
          title: title || undefined,
        }
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create item')
      }

      console.log('Item created successfully')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setAiStatus(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name)
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setInputType('file')
      if (!title) {
        setTitle(droppedFile.name)
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const pastedFile = item.getAsFile()
        if (pastedFile) {
          e.preventDefault()
          setFile(pastedFile)
          setInputType('file')
          if (!title) {
            setTitle(pastedFile.name || 'Image from clipboard')
          }
          break
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="p-4">
          {/* Type Selector */}
          <div className="flex gap-2 mb-4">
            <TypeButton
              icon={<FileText className="h-4 w-4" />}
              label="Text"
              active={inputType === 'text'}
              onClick={() => setInputType('text')}
            />
            <TypeButton
              icon={<LinkIcon className="h-4 w-4" />}
              label="Link"
              active={inputType === 'link'}
              onClick={() => setInputType('link')}
            />
            <TypeButton
              icon={<ImageIcon className="h-4 w-4" />}
              label="File"
              active={inputType === 'file'}
              onClick={() => setInputType('file')}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Content Input */}
          {inputType === 'file' ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg p-8 text-center hover:border-primary-400 dark:hover:border-sky-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
              {file ? (
                <p className="text-gray-900 dark:text-white font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-slate-400 font-medium">
                    Drop a file, paste an image, or click to browse
                  </p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                    Supports images, documents, and more
                  </p>
                </>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                inputType === 'link'
                  ? 'Paste a URL...'
                  : 'Type or paste your content here...'
              }
              className="w-full h-32 p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg resize-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          )}

          {/* Title Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this item a title..."
              className="w-full p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* AI Status */}
          {aiStatus && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-2 rounded-xl">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>{aiStatus}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!content && !file)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-sky-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-sky-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? (aiStatus ? 'Analyzing...' : 'Saving...') : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TypeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
        active
          ? 'bg-primary-100 dark:bg-sky-900/40 text-primary-700 dark:text-sky-300'
          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
