'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, Check, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: unknown,
          callback?: (response: unknown) => void
        ) => void
      }
    }
  }
}

export default function ExtensionConnectPage() {
  const [status, setStatus] = useState<'checking' | 'not-logged-in' | 'connecting' | 'connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndConnect()
  }, [])

  async function checkAuthAndConnect() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setStatus('not-logged-in')
        return
      }

      setStatus('connecting')

      // Store token in localStorage for the content script to pick up
      storeTokenLocally(session.access_token)
    } catch (err) {
      setError('Failed to connect')
      setStatus('error')
    }
  }

  function storeTokenLocally(token: string) {
    // Store token in a way the extension can access
    localStorage.setItem('novamind_extension_token', token)
    setStatus('connected')

    // Also try to communicate with extension via window message
    window.postMessage({
      type: 'NOVAMIND_AUTH_TOKEN',
      token
    }, '*')
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-sky-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'not-logged-in') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 text-center">
          <Brain className="h-12 w-12 text-primary-600 dark:text-sky-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Login Required</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Please log in to Novamind first, then return to this page.
          </p>
          <a
            href="/login?redirect=/extension/connect"
            className="inline-block bg-primary-600 dark:bg-sky-500 text-white px-6 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-sky-600 font-medium transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    )
  }

  if (status === 'connected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Extension Connected!</h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Your Novamind extension is now connected. You can close this tab.
          </p>
          <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg text-left text-sm">
            <p className="font-medium text-gray-700 dark:text-slate-300 mb-2">Next steps:</p>
            <ol className="list-decimal list-inside text-gray-600 dark:text-slate-400 space-y-1">
              <li>Click the Novamind extension icon</li>
              <li>Click &quot;Refresh&quot; to sync</li>
              <li>Start saving content!</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-sky-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-slate-400">Connecting extension...</p>
      </div>
    </div>
  )
}
