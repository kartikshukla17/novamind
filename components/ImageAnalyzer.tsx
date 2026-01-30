'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { describeImage, initializeImageCaption } from '@/lib/ai/local-ai'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'

interface UnanalyzedImage {
  id: string
  thumbnail_url: string
  title: string | null
}

type Phase = 'idle' | 'checking' | 'analyzing' | 'done' | 'none'

/**
 * Background component that analyzes images without AI descriptions
 * Runs automatically when the dashboard loads
 */
export function ImageAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false)
  const [queue, setQueue] = useState<UnanalyzedImage[]>([])
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [completed, setCompleted] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [doneMessage, setDoneMessage] = useState<string>('')
  const isProcessing = useRef(false)
  const supabase = createClient()

  // Check for unanalyzed images on mount, but with a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUnanalyzedImages()
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  async function checkForUnanalyzedImages() {
    try {
      setPhase('checking')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPhase('none')
        return
      }

      const { data: images } = await supabase
        .from('items')
        .select('id, thumbnail_url, title, ai_summary')
        .eq('user_id', user.id)
        .eq('type', 'image')
        .not('thumbnail_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!images) {
        setPhase('none')
        return
      }

      const unanalyzed = images.filter(img => 
        img.thumbnail_url && 
        (!img.ai_summary || img.ai_summary.length < 10)
      )

      if (unanalyzed.length > 0) {
        setQueue(unanalyzed)
        setPhase('analyzing')
        setTimeout(() => processQueue(unanalyzed), 800)
      } else {
        setDoneMessage('No images need analysis')
        setPhase('done')
        setTimeout(() => setPhase('none'), 3000)
      }
    } catch (error) {
      console.error('Error checking for unanalyzed images:', error)
      setPhase('none')
    }
  }

  async function processQueue(images: UnanalyzedImage[]) {
    if (isProcessing.current || images.length === 0) return
    isProcessing.current = true
    setAnalyzing(true)
    let successCount = 0
    let modelFailed = false
    let modelErrorMessage = "AI model couldn't load — check your connection and try again."

    try {
      setCurrentImage('Loading AI model...')
      await initializeImageCaption((progress, status) => {
        setCurrentImage(`Loading AI: ${status}`)
      })

      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        setCurrentImage(image.title || `Image ${i + 1}`)

        try {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(image.thumbnail_url)}`
          const imageRes = await fetch(proxyUrl)
          if (!imageRes.ok) {
            setCompleted(i + 1)
            continue
          }
          const imageBlob = await imageRes.blob()

          const description = await describeImage(imageBlob, (progress, status) => {
            setCurrentImage(`${image.title || `Image ${i + 1}`}: ${status || Math.round(progress)}%`)
          })

          if (description) {
            const tags = extractTagsFromDescription(description)
            await supabase
              .from('items')
              .update({
                ai_summary: description.slice(0, 500),
                ai_tags: tags,
                updated_at: new Date().toISOString(),
              })
              .eq('id', image.id)
            successCount += 1
            console.log(`✓ Analyzed: ${description.slice(0, 60)}...`)
          }
          setCompleted(i + 1)
        } catch (err) {
          setCompleted(i + 1)
        }
      }
    } catch (error) {
      modelFailed = true
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Image analysis failed:', error)
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('CORS') || errMsg.includes('Failed to fetch')) {
        modelErrorMessage = "Model couldn't load — check your connection and that nothing is blocking Hugging Face (e.g. ad blocker)."
      } else {
        modelErrorMessage = `Model couldn't load: ${errMsg.slice(0, 70)}${errMsg.length > 70 ? '…' : ''}`
      }
    } finally {
      isProcessing.current = false
      setAnalyzing(false)
      setCurrentImage(null)
      if (modelFailed) {
        setDoneMessage(modelErrorMessage)
      } else if (successCount === 0) {
        setDoneMessage(
          "No images could be analyzed (load or model failed). Try again later."
        )
      } else {
        setDoneMessage(
          `Done! ${successCount} image${successCount === 1 ? '' : 's'} analyzed — you can search by content now.`
        )
      }
      setPhase('done')
      setTimeout(() => setPhase('none'), 8000)
    }
  }

  if (phase === 'idle' || phase === 'none') return null

  const card = (
    <div
      className="fixed bottom-6 right-6 z-[9999] animate-fade-in"
      style={{ position: 'fixed' }}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white dark:bg-warm-800 rounded-xl shadow-xl border-2 border-warm-200 dark:border-warm-700 p-4 max-w-sm min-w-[280px]">
        <div className="flex items-center gap-3">
          {phase === 'checking' && (
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" />
            </div>
          )}
          {analyzing && (
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" />
            </div>
          )}
          {(phase === 'done' && !analyzing) && (
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          )}
          {(phase === 'analyzing' && !analyzing) && (
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-500 shrink-0" />
              <span className="text-sm font-medium text-warm-900 dark:text-warm-50">
                {phase === 'checking' && 'Checking for images…'}
                {phase === 'analyzing' && (analyzing ? 'Analyzing Images' : `${queue.length} images ready`)}
                {phase === 'done' && (completed > 0 ? 'Analysis Complete' : 'Image analysis')}
              </span>
            </div>
            <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5 break-words">
              {phase === 'checking' && 'Looking for images that need descriptions…'}
              {analyzing && `${completed}/${queue.length}: ${currentImage ?? '…'}`}
              {phase === 'done' && doneMessage}
              {phase === 'analyzing' && !analyzing && 'Starting analysis…'}
            </p>
          </div>
        </div>
        {analyzing && queue.length > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-warm-100 dark:bg-warm-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${queue.length ? (completed / queue.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(card, document.body)
  }
  return card
}

/**
 * Extract relevant tags from an AI-generated image description
 */
function extractTagsFromDescription(description: string): string[] {
  const text = description.toLowerCase()
  
  const tagKeywords: Record<string, string[]> = {
    'nature': ['tree', 'forest', 'mountain', 'ocean', 'beach', 'sky', 'sunset', 'sunrise', 'flower', 'plant', 'garden', 'landscape', 'sun', 'moon', 'star'],
    'people': ['person', 'man', 'woman', 'child', 'people', 'face', 'portrait', 'group'],
    'animal': ['dog', 'cat', 'bird', 'animal', 'pet', 'wildlife'],
    'food': ['food', 'meal', 'dish', 'restaurant', 'cooking', 'plate', 'fruit', 'vegetable'],
    'technology': ['computer', 'phone', 'screen', 'laptop', 'device', 'technology', 'code', 'website'],
    'building': ['building', 'house', 'architecture', 'city', 'street', 'room', 'interior'],
    'art': ['art', 'painting', 'drawing', 'design', 'illustration', 'colorful'],
    'text': ['text', 'sign', 'writing', 'document', 'book', 'letter'],
    'vehicle': ['car', 'vehicle', 'road', 'transport', 'bike', 'airplane'],
  }
  
  const foundTags: string[] = []
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      foundTags.push(tag)
    }
  }
  
  return [...new Set(foundTags)].slice(0, 5)
}
