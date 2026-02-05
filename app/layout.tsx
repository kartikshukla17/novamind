import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LenisProvider } from '@/components/LenisProvider'
import { PWAInstaller } from '@/components/PWAInstaller'
import { CapacitorProvider } from '@/components/CapacitorProvider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Novamind - Your Second Brain',
  description: 'Remember everything. Organize nothing. Your private AI-powered second brain for capturing and organizing ideas, links, images, and more.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Novamind',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#fafaf9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Enable safe area insets for mobile devices
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} antialiased bg-warm-50 text-warm-900`}>
        <CapacitorProvider />
        <LenisProvider>
          {children}
        </LenisProvider>
        <PWAInstaller />
      </body>
    </html>
  )
}
