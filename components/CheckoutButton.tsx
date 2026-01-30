'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  children: React.ReactNode
  className?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function CheckoutButton({
  children,
  className = '',
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)

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

      // Ensure Razorpay script is loaded
      if (typeof window !== 'undefined' && !window.Razorpay) {
        await loadRazorpayScript()
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
            onSuccess?.()
            window.location.reload()
          } else {
            const verifyData = await verifyResponse.json()
            onError?.(verifyData.error || 'Payment verification failed')
          }
        },
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
      onError?.(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

// Load Razorpay script dynamically
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('razorpay-script')) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
    }
  }
}
