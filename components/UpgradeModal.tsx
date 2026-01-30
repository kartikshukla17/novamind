'use client'

import { useState } from 'react'
import { X, Sparkles, Zap, Folder, Chrome, HeadphonesIcon, Download } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'items' | 'boards' | 'extension' | 'general'
  currentCount?: number
  limit?: number
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason = 'general',
  currentCount,
  limit,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const reasonMessages = {
    items: `You've reached your limit of ${limit} items. Upgrade to Pro for unlimited storage.`,
    boards: `You've reached your limit of ${limit} board${limit === 1 ? '' : 's'}. Upgrade to Pro for unlimited boards.`,
    extension: 'The browser extension is a Pro feature. Upgrade to save content with one click.',
    general: 'Unlock the full power of Novamind with Pro.',
  }

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Novamind',
        description: 'Pro Subscription - Monthly',
        handler: async function (response: {
          razorpay_subscription_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          // Verify payment
          const verifyResponse = await fetch('/api/subscription/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })

          if (verifyResponse.ok) {
            window.location.reload()
          } else {
            setError('Payment verification failed. Please contact support.')
          }
        },
        prefill: {},
        theme: {
          color: '#7c3aed',
        },
        modal: {
          ondismiss: function () {
            setLoading(false)
          },
        },
      }

      // @ts-expect-error - Razorpay is loaded from script
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-warm-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-warm-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-warm-500 dark:text-warm-400">
            {reasonMessages[reason]}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <Feature icon={<Zap />} text="Unlimited items" />
          <Feature icon={<Folder />} text="Unlimited boards" />
          <Feature icon={<Chrome />} text="Browser extension" />
          <Feature icon={<Sparkles />} text="Advanced AI features" />
          <Feature icon={<HeadphonesIcon />} text="Priority support" />
          <Feature icon={<Download />} text="Export your data" />
        </div>

        {/* Price */}
        <div className="text-center mb-6 p-4 bg-warm-50 dark:bg-warm-800 rounded-xl">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-sm text-warm-500 dark:text-warm-400">₹</span>
            <span className="text-3xl font-bold text-warm-900 dark:text-warm-50">749</span>
            <span className="text-warm-500 dark:text-warm-400">/month</span>
          </div>
          <p className="text-xs text-warm-400 dark:text-warm-500 mt-1">
            Cancel anytime
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all shadow-glow hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Upgrade Now'}
        </button>

        <p className="text-center text-xs text-warm-400 dark:text-warm-500 mt-4">
          Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400">
        {icon}
      </div>
      <span className="text-warm-700 dark:text-warm-300">{text}</span>
    </div>
  )
}

// Hook to manage upgrade modal state
export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalProps, setModalProps] = useState<Omit<UpgradeModalProps, 'isOpen' | 'onClose'>>({})

  const showUpgradeModal = (props?: Omit<UpgradeModalProps, 'isOpen' | 'onClose'>) => {
    setModalProps(props || {})
    setIsOpen(true)
  }

  const hideUpgradeModal = () => {
    setIsOpen(false)
    setModalProps({})
  }

  return {
    isOpen,
    modalProps,
    showUpgradeModal,
    hideUpgradeModal,
  }
}
