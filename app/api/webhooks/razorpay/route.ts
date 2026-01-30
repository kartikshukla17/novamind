import { NextResponse } from 'next/server'
import { processWebhookEvent } from '@/lib/razorpay/webhooks'
import { rateLimitMiddleware } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitMiddleware(request, 'webhooks')
  if (!rateLimit.allowed) return rateLimit.response!

  // Get the raw body for signature verification
  const rawBody = await request.text()

  // Get Razorpay signature from headers
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const result = await processWebhookEvent(rawBody, signature)

    if (!result.success) {
      console.error('Webhook processing failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Razorpay doesn't send GET requests to webhooks, but we'll handle it gracefully
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
