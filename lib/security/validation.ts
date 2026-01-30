import { z, ZodSchema, ZodError } from 'zod'

// Subscription creation schema
export const createSubscriptionSchema = z.object({
  planId: z.string().optional(),
})

// Payment verification schema
export const verifyPaymentSchema = z.object({
  razorpay_subscription_id: z.string().min(1, 'Subscription ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
})

// Cancel subscription schema
export const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
})

// Razorpay webhook payload schema
export const razorpayWebhookSchema = z.object({
  entity: z.string(),
  account_id: z.string(),
  event: z.string(),
  contains: z.array(z.string()),
  payload: z.object({
    subscription: z.object({
      entity: z.object({
        id: z.string(),
        plan_id: z.string(),
        status: z.string(),
        current_start: z.number(),
        current_end: z.number(),
        customer_id: z.string(),
        notes: z.record(z.string(), z.string()).optional(),
      }),
    }).optional(),
    payment: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        order_id: z.string().nullable(),
        method: z.string(),
        email: z.string(),
        contact: z.string(),
        notes: z.record(z.string(), z.string()).optional(),
        error_code: z.string().nullable(),
        error_description: z.string().nullable(),
      }),
    }).optional(),
  }),
  created_at: z.number(),
})

// Item creation schema (for validation)
export const createItemSchema = z.object({
  type: z.enum(['text', 'link', 'image', 'file']),
  content: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().max(500).optional(),
  file_path: z.string().optional(),
  file_type: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
})

// Board creation schema
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
})

/**
 * Validate request body against a schema
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const zodError = result.error as ZodError
      const errors = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }

    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate URL is safe (not javascript:, data:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
