interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory rate limiter
// For production with multiple instances, use Redis (Upstash)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Rate limit configurations by endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Subscription endpoints - stricter limits
  'subscription': { maxRequests: 10, windowMs: 60000 }, // 10 req/min
  'subscription/create': { maxRequests: 5, windowMs: 60000 }, // 5 req/min
  'subscription/verify': { maxRequests: 10, windowMs: 60000 }, // 10 req/min
  'subscription/cancel': { maxRequests: 5, windowMs: 60000 }, // 5 req/min

  // Content endpoints
  'items': { maxRequests: 60, windowMs: 60000 }, // 60 req/min
  'items/create': { maxRequests: 30, windowMs: 60000 }, // 30 req/min
  'boards': { maxRequests: 30, windowMs: 60000 }, // 30 req/min
  'boards/create': { maxRequests: 10, windowMs: 60000 }, // 10 req/min

  // Webhook endpoints - higher limits
  'webhooks': { maxRequests: 100, windowMs: 60000 }, // 100 req/min

  // Default
  'default': { maxRequests: 60, windowMs: 60000 }, // 60 req/min
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

/**
 * Check if a request is rate limited
 * @param identifier - Unique identifier (e.g., IP, user ID)
 * @param endpoint - The endpoint being accessed
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string
): RateLimitResult {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default']
  const key = `${endpoint}:${identifier}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Reset if window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit: config.maxRequests,
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  }
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
  endpoint: string,
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    // Get identifier from headers or IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const identifier = forwardedFor?.split(',')[0].trim() || realIp || 'unknown'

    const result = checkRateLimit(identifier, endpoint)
    const headers = getRateLimitHeaders(result)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            ...headers,
          },
        }
      )
    }

    const response = await handler(request)

    // Add rate limit headers to response
    const newHeaders = new Headers(response.headers)
    Object.entries(headers).forEach(([key, value]) => {
      newHeaders.set(key, value)
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }
}

/**
 * Middleware-style rate limiter for Next.js API routes
 */
export function rateLimitMiddleware(
  request: Request,
  endpoint: string
): { allowed: boolean; response?: Response } {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const identifier = forwardedFor?.split(',')[0].trim() || realIp || 'unknown'

  const result = checkRateLimit(identifier, endpoint)

  if (!result.allowed) {
    const headers = getRateLimitHeaders(result)
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            ...headers,
          },
        }
      ),
    }
  }

  return { allowed: true }
}
