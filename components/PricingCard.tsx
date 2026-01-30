'use client'

import { Check } from 'lucide-react'

export interface PricingPlan {
  name: string
  price: number | string
  period: string
  description: string
  features: string[]
  isPopular?: boolean
  ctaText: string
  ctaAction?: () => void
  isCurrentPlan?: boolean
  disabled?: boolean
}

interface PricingCardProps {
  plan: PricingPlan
}

export function PricingCard({ plan }: PricingCardProps) {
  const {
    name,
    price,
    period,
    description,
    features,
    isPopular,
    ctaText,
    ctaAction,
    isCurrentPlan,
    disabled,
  } = plan

  return (
    <div
      className={`relative bg-white dark:bg-warm-900 rounded-2xl border-2 p-8 flex flex-col ${
        isPopular
          ? 'border-primary-500 shadow-glow'
          : 'border-warm-200 dark:border-warm-800'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary-500 text-white text-sm font-medium px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-warm-900 dark:text-warm-50 mb-2">
          {name}
        </h3>
        <p className="text-warm-500 dark:text-warm-400 text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          {typeof price === 'number' ? (
            <>
              <span className="text-sm text-warm-500 dark:text-warm-400">₹</span>
              <span className="text-4xl font-bold text-warm-900 dark:text-warm-50">
                {price}
              </span>
            </>
          ) : (
            <span className="text-4xl font-bold text-warm-900 dark:text-warm-50">
              {price}
            </span>
          )}
          <span className="text-warm-500 dark:text-warm-400 text-sm">/{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-warm-600 dark:text-warm-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={ctaAction}
        disabled={disabled || isCurrentPlan}
        className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${
          isCurrentPlan
            ? 'bg-warm-100 dark:bg-warm-800 text-warm-500 dark:text-warm-400 cursor-not-allowed'
            : isPopular
            ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-glow hover:shadow-lg active:scale-[0.98]'
            : 'bg-warm-900 dark:bg-warm-100 hover:bg-warm-800 dark:hover:bg-warm-200 text-warm-50 dark:text-warm-900 active:scale-[0.98]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isCurrentPlan ? 'Current Plan' : ctaText}
      </button>
    </div>
  )
}

export function PricingSection({
  onSelectFree,
  onSelectPro,
  currentPlan,
  loading,
}: {
  onSelectFree?: () => void
  onSelectPro?: () => void
  currentPlan?: 'free' | 'pro'
  loading?: boolean
}) {
  const freePlan: PricingPlan = {
    name: 'Free',
    price: '0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 50 items',
      'Basic AI categorization',
      '1 custom board',
      'Web app access',
    ],
    ctaText: 'Get Started',
    ctaAction: onSelectFree,
    isCurrentPlan: currentPlan === 'free',
  }

  const proPlan: PricingPlan = {
    name: 'Pro',
    price: 749,
    period: 'month',
    description: 'For power users who want it all',
    features: [
      'Unlimited items',
      'Advanced AI categorization',
      'Unlimited boards',
      'Browser extension',
      'Priority support',
      'Export your data',
    ],
    isPopular: true,
    ctaText: loading ? 'Loading...' : 'Upgrade to Pro',
    ctaAction: onSelectPro,
    isCurrentPlan: currentPlan === 'pro',
    disabled: loading,
  }

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-display-md font-bold text-warm-900 dark:text-warm-50 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-warm-600 dark:text-warm-400 max-w-xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <PricingCard plan={freePlan} />
          <PricingCard plan={proPlan} />
        </div>

        {/* Payment badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-warm-400 dark:text-warm-500">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <span>Cards</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span>UPI</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            <span>Net Banking</span>
          </div>
          <span className="text-sm">Powered by Razorpay</span>
        </div>
      </div>
    </section>
  )
}
