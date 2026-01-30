import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle content shared via Web Share Target API
 * This endpoint receives content when users share from other apps to Novamind
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login?redirect=/all', request.url))
  }

  try {
    const formData = await request.formData()

    const title = formData.get('title') as string | null
    const text = formData.get('text') as string | null
    const url = formData.get('url') as string | null
    const files = formData.getAll('files') as File[]

    // Determine what type of content we received
    if (files && files.length > 0) {
      // Handle file shares (images, etc.)
      for (const file of files) {
        if (file.size === 0) continue

        const filename = `${Date.now()}-${file.name}`
        const path = `${user.id}/${filename}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(path)

        const isImage = file.type.startsWith('image/')

        // Create item
        await supabase.from('items').insert({
          user_id: user.id,
          type: isImage ? 'image' : 'file',
          title: title || file.name,
          file_path: path,
          file_type: file.type,
          thumbnail_url: isImage ? publicUrl : null,
          content: text || null,
        })
      }
    } else if (url) {
      // Handle URL shares
      await supabase.from('items').insert({
        user_id: user.id,
        type: 'link',
        url: url,
        title: title || url,
        content: text || null,
      })
    } else if (text) {
      // Handle text shares
      await supabase.from('items').insert({
        user_id: user.id,
        type: 'text',
        content: text,
        title: title || text.slice(0, 100),
      })
    }

    // Redirect to all items page
    return NextResponse.redirect(new URL('/all?shared=true', request.url))

  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.redirect(new URL('/all?error=share_failed', request.url))
  }
}

// Also support GET for the share target registration check
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Share target is active' })
}
