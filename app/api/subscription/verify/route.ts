import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPaymentSignature, fetchSubscription } from '@/lib/razorpay/client'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'
import { validateBody, verifyPaymentSchema } from '@/lib/security/validation'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'subscription/verify')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request body
  const validation = await validateBody(request, verifyPaymentSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = validation.data

  try {
    // Verify the payment signature
    const isValid = verifyPaymentSignature({
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    })

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Fetch subscription details from Razorpay
    const subscriptionDetails = await fetchSubscription(razorpay_subscription_id)
    const serviceClient = await createServiceClient()

    // Update subscription status
    const { data: subscription, error } = await serviceClient
      .from('subscriptions')
      .update({
        status: subscriptionDetails.status === 'active' ? 'active' : 'authenticated',
        current_period_start: new Date(subscriptionDetails.current_start * 1000).toISOString(),
        current_period_end: new Date(subscriptionDetails.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', razorpay_subscription_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription:', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    // Record the payment
    await serviceClient.from('payments').insert({
      user_id: user.id,
      subscription_id: subscription.id,
      razorpay_payment_id,
      amount: subscriptionDetails.notes?.amount || 74900, // Default to Pro plan amount
      currency: 'INR',
      status: 'captured',
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
