'use client'

/**
 * Capacitor Provider
 * Initializes Capacitor on app start for native mobile features
 */

import { useEffect } from 'react'
import { initializeCapacitor } from '@/lib/capacitor'

export function CapacitorProvider() {
  useEffect(() => {
    // Initialize Capacitor on mount
    initializeCapacitor().catch((error) => {
      console.error('Failed to initialize Capacitor:', error)
    })
  }, [])

  // This component doesn't render anything
  return null
}
