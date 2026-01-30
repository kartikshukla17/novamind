'use client'

import { ReactNode } from 'react'
import { LocalFirstProvider } from './LocalFirstProvider'
import { AIStatus } from './AIStatus'

interface DashboardWrapperProps {
  children: ReactNode
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  return (
    <LocalFirstProvider>
      {children}
      <AIStatus />
    </LocalFirstProvider>
  )
}
