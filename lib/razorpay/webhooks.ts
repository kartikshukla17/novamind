import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from './client'

export interface RazorpayWebhookEvent {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    subscription?: {
      entity: RazorpaySubscription
    }
    payment?: {
      entity: RazorpayPayment
    }
  }
  created_at: number
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  status: string
  current_start: number
  current_end: number
  ended_at: number | null
  quantity: number
  notes: Record<string, string>
  charge_at: number
  offer_id: string | null
  short_url: string
  has_scheduled_changes: boolean
  change_scheduled_at: number | null
  source: string
  payment_method: string
  customer_id: string
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string | null
  method: string
  description: string | null
  bank: string | null
  wallet: string | null
  vpa: string | null
  email: string
  contact: string
  customer_id: string
  notes: Record<string, string>
  fee: number
  tax: number
  error_code: string | null
  error_description: string | null
  error_source: string | null
  error_step: string | null
  error_reason: string | null
  acquirer_data: Record<string, unknown>
  created_at: number
}

/**
 * Process a Razorpay webhook event
 * Returns true if processed successfully
 */
export async function processWebhookEvent(
  rawBody: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  // Verify signature
  try {
    const isValid = verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      return { success: false, error: 'Invalid signature' }
    }
  } catch (error) {
    return { success: false, error: 'Signature verification failed' }
  }

  const event: RazorpayWebhookEvent = JSON.parse(rawBody)
  const supabase = await createServiceClient()

  // Check for idempotency
  const eventId = `${event.event}_${event.created_at}`
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id, processed')
    .eq('event_id', eventId)
    .single()

  if (existingEvent?.processed) {
    return { success: true } // Already processed
  }

  // Store the event
  if (!existingEvent) {
    await supabase.from('webhook_events').insert({
      event_id: eventId,
      event_type: event.event,
      payload: event,
      processed: false,
    })
  }

  try {
    // Process based on event type
    switch (event.event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(supabase, event)
        break
      case 'subscription.charged':
        await handleSubscriptionCharged(supabase, event)
        break
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(supabase, event)
        break
      case 'subscription.halted':
        await handleSubscriptionHalted(supabase, event)
        break
      case 'subscription.pending':
        await handleSubscriptionPending(supabase, event)
        break
      case 'subscription.completed':
        await handleSubscriptionCompleted(supabase, event)
        break
      case 'payment.captured':
        await handlePaymentCaptured(supabase, event)
        break
      case 'payment.failed':
        await handlePaymentFailed(supabase, event)
        break
      default:
        console.log(`Unhandled webhook event: ${event.event}`)
    }

    // Mark event as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', eventId)

    return { success: true }
  } catch (error) {
    console.error('Error processing webhook event:', error)
    return { success: false, error: String(error) }
  }
}

async function handleSubscriptionActivated(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  if (!subscription) return

  const userId = subscription.notes?.user_id
  if (!userId) {
    console.error('No user_id in subscription notes')
    return
  }

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: subscription.customer_id,
      razorpay_plan_id: subscription.plan_id,
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      metadata: subscription.notes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
}

async function handleSubscriptionCharged(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  const payment = event.payload.payment?.entity
  if (!subscription) return

  const userId = subscription.notes?.user_id
  if (!userId) return

  // Update subscription period
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)

  // Record payment if present
  if (payment) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('razorpay_subscription_id', subscription.id)
      .single()

    await supabase.from('payments').upsert({
      user_id: userId,
      subscription_id: sub?.id,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'captured',
      method: payment.method,
    }, {
      onConflict: 'razorpay_payment_id'
    })
  }
}

async function handleSubscriptionCancelled(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionHalted(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'halted',
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionPending(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handleSubscriptionCompleted(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const subscription = event.payload.subscription?.entity
  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id)
}

async function handlePaymentCaptured(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const payment = event.payload.payment?.entity
  if (!payment) return

  const userId = payment.notes?.user_id
  if (!userId) return

  // Find subscription if linked
  let subscriptionId: string | null = null
  if (payment.notes?.subscription_id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('razorpay_subscription_id', payment.notes.subscription_id)
      .single()
    subscriptionId = sub?.id || null
  }

  await supabase.from('payments').upsert({
    user_id: userId,
    subscription_id: subscriptionId,
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'captured',
    method: payment.method,
  }, {
    onConflict: 'razorpay_payment_id'
  })
}

async function handlePaymentFailed(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  event: RazorpayWebhookEvent
) {
  const payment = event.payload.payment?.entity
  if (!payment) return

  const userId = payment.notes?.user_id
  if (!userId) return

  await supabase.from('payments').upsert({
    user_id: userId,
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'failed',
    method: payment.method,
    error_code: payment.error_code,
    error_description: payment.error_description,
  }, {
    onConflict: 'razorpay_payment_id'
  })
}
