'use client'

import { ReactNode } from 'react'
import { LocalFirstProvider } from './LocalFirstProvider'
import { ThemeProvider } from './ThemeProvider'
import { AIStatus } from './AIStatus'
import { ImageAnalyzer } from './ImageAnalyzer'

interface DashboardWrapperProps {
  children: ReactNode
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  return (
    <ThemeProvider>
      <LocalFirstProvider>
        {children}
        <AIStatus />
        <ImageAnalyzer />
      </LocalFirstProvider>
    </ThemeProvider>
  )
}
