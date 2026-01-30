import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'

export async function GET(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'default')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()

  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('amount', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add the free tier (not stored in DB)
    const allPlans = [
      {
        id: 'free',
        name: 'Free',
        amount: 0,
        currency: 'INR',
        interval: 'forever',
        features: [
          'Up to 50 items',
          'Basic AI categorization',
          '1 custom board',
        ],
        is_active: true,
      },
      ...plans.map(plan => ({
        ...plan,
        amount: plan.amount / 100, // Convert paise to INR for display
      })),
    ]

    return NextResponse.json(allPlans)
  } catch (error) {
    console.error('Error in plans API:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}
