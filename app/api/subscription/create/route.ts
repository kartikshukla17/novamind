import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createSubscription, createCustomer, getProPlanId, getPublicKey } from '@/lib/razorpay/client'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'
import { validateBody, createSubscriptionSchema } from '@/lib/security/validation'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'subscription/create')
  if (!rateLimit.allowed) return rateLimit.response!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request body
  const validation = await validateBody(request, createSubscriptionSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const planId = validation.data.planId || getProPlanId()
    const serviceClient = await createServiceClient()

    // Check if user already has an active subscription
    const { data: existingSub } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'authenticated', 'created'])
      .single()

    if (existingSub) {
      return NextResponse.json({
        error: 'You already have an active subscription',
        subscription: existingSub,
      }, { status: 400 })
    }

    // Create or retrieve Razorpay customer
    let customerId: string | undefined

    // Check if user has a customer ID stored
    const { data: subRecord } = await serviceClient
      .from('subscriptions')
      .select('razorpay_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subRecord?.razorpay_customer_id) {
      customerId = subRecord.razorpay_customer_id
    } else {
      // Create new customer
      const customer = await createCustomer({
        email: user.email!,
        notes: { user_id: user.id },
      })
      customerId = customer.id
    }

    // Create Razorpay subscription
    const subscription = await createSubscription({
      planId,
      customerId,
      totalCount: 12, // 12 billing cycles
      notes: {
        user_id: user.id,
        user_email: user.email!,
      },
    })

    // Store subscription in database
    await serviceClient.from('subscriptions').upsert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: customerId,
      razorpay_plan_id: planId,
      status: 'created',
      metadata: { created_via: 'api' },
    }, {
      onConflict: 'user_id'
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      keyId: getPublicKey(),
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json({
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
