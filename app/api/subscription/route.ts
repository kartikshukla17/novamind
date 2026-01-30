import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus, getFeatureLimits } from '@/lib/subscription/feature-gate'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'

export async function GET(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'subscription')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const status = await getSubscriptionStatus(user.id)
    const limits = getFeatureLimits(status.tier)

    // Get current usage counts
    const [itemsResult, boardsResult] = await Promise.all([
      supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('boards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_ai_generated', false),
    ])

    return NextResponse.json({
      ...status,
      limits,
      usage: {
        items: itemsResult.count || 0,
        boards: boardsResult.count || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
