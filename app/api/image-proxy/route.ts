import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'

/**
 * Proxies an image URL so the client can load it for AI analysis without CORS issues.
 * Only allows URLs from our Supabase storage or same origin.
 */
export async function GET(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const isAllowed =
      url.startsWith(supabaseUrl) ||
      url.startsWith('/') ||
      url.startsWith(request.nextUrl.origin)

    if (!isAllowed) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
    }

    const res = await fetch(url, {
      headers: { Accept: 'image/*' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') || 'image/png'
    const blob = await res.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 })
  }
}
