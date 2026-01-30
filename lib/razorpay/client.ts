import Razorpay from 'razorpay'
import crypto from 'crypto'

// Server-side Razorpay instance
let razorpayInstance: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured')
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayInstance
}

export interface RazorpaySubscriptionResponse {
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

export interface CreateSubscriptionParams {
  planId: string
  customerId?: string
  totalCount?: number
  customerNotify?: 0 | 1
  notes?: Record<string, string>
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<RazorpaySubscriptionResponse> {
  const razorpay = getRazorpay()

  const subscriptionData = {
    plan_id: params.planId,
    total_count: params.totalCount || 12,
    customer_notify: params.customerNotify ?? 1,
    customer_id: params.customerId,
    notes: params.notes,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (razorpay.subscriptions.create as any)(subscriptionData)
  return result as RazorpaySubscriptionResponse
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionResponse> {
  const razorpay = getRazorpay()
  const result = await razorpay.subscriptions.fetch(subscriptionId)
  return result as unknown as RazorpaySubscriptionResponse
}

export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true) {
  const razorpay = getRazorpay()
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}

export interface RazorpayCustomerResponse {
  id: string
  entity: string
  name: string | null
  email: string
  contact: string | null
  gstin: string | null
  notes: Record<string, string>
  created_at: number
}

export async function createCustomer(params: {
  name?: string
  email: string
  contact?: string
  notes?: Record<string, string>
}): Promise<RazorpayCustomerResponse> {
  const razorpay = getRazorpay()
  const result = await razorpay.customers.create({
    name: params.name || undefined,
    email: params.email,
    contact: params.contact || undefined,
    notes: params.notes || undefined,
  })
  return result as unknown as RazorpayCustomerResponse
}

export async function fetchPayment(paymentId: string) {
  const razorpay = getRazorpay()
  return razorpay.payments.fetch(paymentId)
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Webhook secret not configured')
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Verify Razorpay payment signature (for checkout)
 */
export function verifyPaymentSignature(params: {
  razorpay_subscription_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    throw new Error('Razorpay key secret not configured')
  }

  const payload = `${params.razorpay_payment_id}|${params.razorpay_subscription_id}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(params.razorpay_signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Get public key for client-side checkout
 */
export function getPublicKey(): string {
  return process.env.RAZORPAY_KEY_ID || ''
}

/**
 * Get the Pro plan ID from environment
 */
export function getProPlanId(): string {
  const planId = process.env.RAZORPAY_PLAN_ID_PRO
  if (!planId) {
    throw new Error('Pro plan ID not configured')
  }
  return planId
}
