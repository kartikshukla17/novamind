'use client'

import { Crown, Sparkles } from 'lucide-react'

interface SubscriptionBadgeProps {
  tier: 'free' | 'pro'
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function SubscriptionBadge({ tier, showLabel = true, size = 'md' }: SubscriptionBadgeProps) {
  const sizes = {
    sm: {
      container: 'px-2 py-1 gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 gap-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
  }

  if (tier === 'pro') {
    return (
      <div
        className={`inline-flex items-center ${sizes[size].container} bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full`}
      >
        <Crown className={sizes[size].icon} />
        {showLabel && <span className={`font-medium ${sizes[size].text}`}>Pro</span>}
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center ${sizes[size].container} bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400 rounded-full`}
    >
      <Sparkles className={sizes[size].icon} />
      {showLabel && <span className={`font-medium ${sizes[size].text}`}>Free</span>}
    </div>
  )
}

export function SubscriptionStatus({
  tier,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  tier: 'free' | 'pro'
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}) {
  if (tier === 'free') {
    return (
      <div className="flex items-center gap-2">
        <SubscriptionBadge tier="free" />
        <span className="text-sm text-warm-500 dark:text-warm-400">
          Free plan
        </span>
      </div>
    )
  }

  const endDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null
  const formattedDate = endDate?.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <SubscriptionBadge tier="pro" />
        {cancelAtPeriodEnd && (
          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
            Cancelling
          </span>
        )}
      </div>
      {endDate && (
        <span className="text-xs text-warm-500 dark:text-warm-400">
          {cancelAtPeriodEnd
            ? `Access until ${formattedDate}`
            : `Renews on ${formattedDate}`}
        </span>
      )}
    </div>
  )
}
