import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export type SubscriptionTier = 'free' | 'pro'

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isActive: boolean
  subscriptionId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface FeatureLimits {
  maxItems: number
  maxBoards: number
  hasExtensionAccess: boolean
  hasAdvancedAI: boolean
  hasPrioritySupport: boolean
  hasExportData: boolean
}

// Feature limits by tier
const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    maxItems: parseInt(process.env.FREE_TIER_MAX_ITEMS || '50', 10),
    maxBoards: parseInt(process.env.FREE_TIER_MAX_BOARDS || '1', 10),
    hasExtensionAccess: false,
    hasAdvancedAI: false,
    hasPrioritySupport: false,
    hasExportData: false,
  },
  pro: {
    maxItems: Infinity,
    maxBoards: Infinity,
    hasExtensionAccess: true,
    hasAdvancedAI: true,
    hasPrioritySupport: true,
    hasExportData: true,
  },
}

/**
 * Get the subscription status for a user
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!subscription || !['active', 'authenticated'].includes(subscription.status)) {
    return {
      tier: 'free',
      isActive: false,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  return {
    tier: 'pro',
    isActive: true,
    subscriptionId: subscription.razorpay_subscription_id,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}

/**
 * Get subscription status using service role (for server-side operations)
 */
export async function getSubscriptionStatusService(userId: string): Promise<SubscriptionStatus> {
  const supabase = await createServiceClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!subscription || !['active', 'authenticated'].includes(subscription.status)) {
    return {
      tier: 'free',
      isActive: false,
      subscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  return {
    tier: 'pro',
    isActive: true,
    subscriptionId: subscription.razorpay_subscription_id,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}

/**
 * Get feature limits for a subscription tier
 */
export function getFeatureLimits(tier: SubscriptionTier): FeatureLimits {
  return TIER_LIMITS[tier]
}

/**
 * Check if a user has access to a specific feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof Omit<FeatureLimits, 'maxItems' | 'maxBoards'>
): Promise<boolean> {
  const status = await getSubscriptionStatus(userId)
  const limits = getFeatureLimits(status.tier)
  return limits[feature]
}

/**
 * Check if user can add more items
 */
export async function canAddItem(userId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  tier: SubscriptionTier
}> {
  const supabase = await createClient()
  const status = await getSubscriptionStatus(userId)
  const limits = getFeatureLimits(status.tier)

  // Pro users have unlimited items
  if (status.tier === 'pro') {
    return {
      allowed: true,
      currentCount: 0, // Not relevant for pro
      limit: Infinity,
      tier: status.tier,
    }
  }

  // Count current items
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const currentCount = count || 0

  return {
    allowed: currentCount < limits.maxItems,
    currentCount,
    limit: limits.maxItems,
    tier: status.tier,
  }
}

/**
 * Check if user can add more boards
 */
export async function canAddBoard(userId: string): Promise<{
  allowed: boolean
  currentCount: number
  limit: number
  tier: SubscriptionTier
}> {
  const supabase = await createClient()
  const status = await getSubscriptionStatus(userId)
  const limits = getFeatureLimits(status.tier)

  // Pro users have unlimited boards
  if (status.tier === 'pro') {
    return {
      allowed: true,
      currentCount: 0,
      limit: Infinity,
      tier: status.tier,
    }
  }

  // Count current boards (excluding AI-generated ones)
  const { count } = await supabase
    .from('boards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_ai_generated', false)

  const currentCount = count || 0

  return {
    allowed: currentCount < limits.maxBoards,
    currentCount,
    limit: limits.maxBoards,
    tier: status.tier,
  }
}

/**
 * Enforce item limit and return error response if exceeded
 */
export async function enforceItemLimit(userId: string): Promise<{
  allowed: boolean
  error?: {
    code: string
    message: string
    currentCount: number
    limit: number
  }
}> {
  const result = await canAddItem(userId)

  if (!result.allowed) {
    return {
      allowed: false,
      error: {
        code: 'ITEM_LIMIT_EXCEEDED',
        message: `You've reached your limit of ${result.limit} items. Upgrade to Pro for unlimited items.`,
        currentCount: result.currentCount,
        limit: result.limit,
      },
    }
  }

  return { allowed: true }
}

/**
 * Enforce board limit and return error response if exceeded
 */
export async function enforceBoardLimit(userId: string): Promise<{
  allowed: boolean
  error?: {
    code: string
    message: string
    currentCount: number
    limit: number
  }
}> {
  const result = await canAddBoard(userId)

  if (!result.allowed) {
    return {
      allowed: false,
      error: {
        code: 'BOARD_LIMIT_EXCEEDED',
        message: `You've reached your limit of ${result.limit} board${result.limit === 1 ? '' : 's'}. Upgrade to Pro for unlimited boards.`,
        currentCount: result.currentCount,
        limit: result.limit,
      },
    }
  }

  return { allowed: true }
}
