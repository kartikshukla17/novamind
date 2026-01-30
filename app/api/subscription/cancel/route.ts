import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cancelSubscription as cancelRazorpaySubscription } from '@/lib/razorpay/client'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'
import { validateBody, cancelSubscriptionSchema } from '@/lib/security/validation'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'subscription/cancel')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request body
  const validation = await validateBody(request, cancelSubscriptionSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { cancelAtPeriodEnd } = validation.data
  const serviceClient = await createServiceClient()

  try {
    // Get user's active subscription
    const { data: subscription, error: fetchError } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'authenticated'])
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    if (!subscription.razorpay_subscription_id) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    // Cancel subscription in Razorpay
    await cancelRazorpaySubscription(subscription.razorpay_subscription_id, cancelAtPeriodEnd)

    // Update local subscription record
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (cancelAtPeriodEnd) {
      updateData.cancel_at_period_end = true
    } else {
      updateData.status = 'cancelled'
      updateData.cancelled_at = new Date().toISOString()
    }

    const { error: updateError } = await serviceClient
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: cancelAtPeriodEnd
        ? `Your subscription will be cancelled at the end of the billing period (${new Date(subscription.current_period_end).toLocaleDateString()})`
        : 'Your subscription has been cancelled immediately',
      cancelAtPeriodEnd,
      currentPeriodEnd: subscription.current_period_end,
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json({
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
