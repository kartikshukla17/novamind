import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceBoardLimit } from '@/lib/subscription/feature-gate'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'boards/create')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check board limit
  const limitCheck = await enforceBoardLimit(user.id)
  if (!limitCheck.allowed) {
    return NextResponse.json({
      error: limitCheck.error?.message,
      code: limitCheck.error?.code,
      currentCount: limitCheck.error?.currentCount,
      limit: limitCheck.error?.limit,
      upgradeRequired: true,
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('boards')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        color: color || null,
        icon: icon || null,
        is_ai_generated: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
  }
}
