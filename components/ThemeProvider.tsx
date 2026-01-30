'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const supabase = createClient()

  // Load theme from user settings (sync with DB when logged in)
  useEffect(() => {
    async function loadTheme() {
      const cached = localStorage.getItem('theme') as Theme | null
      if (cached === 'dark' || cached === 'light' || cached === 'system') {
        setThemeState(cached)
        const resolved = cached === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : cached
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .eq('user_id', user.id)
          .single()

        if (data?.theme && (data.theme === 'light' || data.theme === 'dark')) {
          setThemeState(data.theme)
          setResolvedTheme(data.theme)
          localStorage.setItem('theme', data.theme)
          applyTheme(data.theme)
        }
      }
    }

    loadTheme()
  }, [supabase])

  // Listen for system preference changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(newTheme)
        applyTheme(newTheme)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  function applyTheme(t: 'light' | 'dark') {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  async function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    const resolved = newTheme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : newTheme
    setResolvedTheme(resolved)
    localStorage.setItem('theme', newTheme)
    applyTheme(resolved)

    // Save to database if logged in (DB only stores 'light' | 'dark')
    const { data: { user } } = await supabase.auth.getUser()
    if (user && (newTheme === 'light' || newTheme === 'dark')) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, theme: newTheme })
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
