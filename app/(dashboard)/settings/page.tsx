'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { Loader2, Clipboard, Sparkles, Palette, Chrome, Sun, Moon, Check, Settings2, Shield } from 'lucide-react'

interface UserSettings {
  clipboard_monitoring: boolean
  auto_categorize: boolean
  theme: 'light' | 'dark' | 'system'
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    clipboard_monitoring: false,
    auto_categorize: true,
    theme: 'light',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettings({
          clipboard_monitoring: data.clipboard_monitoring ?? false,
          auto_categorize: data.auto_categorize ?? true,
          theme: data.theme ?? 'light',
        })
      }
      setLoading(false)
    }

    loadSettings()
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...settings,
      })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully' })

      // Notify extension about settings change via localStorage
      localStorage.setItem('cognikeep_settings', JSON.stringify(settings))
      window.postMessage({ type: 'COGNIKEEP_SETTINGS_UPDATE', settings }, '*')
    }
    setSaving(false)
  }

  async function handleToggle(key: keyof UserSettings, value: boolean) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    // Auto-save on toggle
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...newSettings,
      })

    // Notify extension
    localStorage.setItem('cognikeep_settings', JSON.stringify(newSettings))
    window.postMessage({ type: 'COGNIKEEP_SETTINGS_UPDATE', settings: newSettings }, '*')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
        <p className="text-warm-500 dark:text-warm-400 text-sm">Loading settings...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-sm font-bold text-warm-900 dark:text-warm-50">Settings</h1>
        <p className="text-warm-500 dark:text-warm-400 mt-1">Manage your CogniKeep preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Browser Extension Section */}
        <SettingsSection
          icon={<Chrome className="h-5 w-5" />}
          title="Browser Extension"
          description="Settings for the CogniKeep browser extension"
          gradient="from-blue-500 to-blue-600"
        >
          <SettingRow
            icon={<Clipboard className="h-5 w-5 text-blue-500" />}
            title="Auto-save Clipboard"
            description="Automatically save text when you copy (Cmd/Ctrl+C) in your browser. Requires the CogniKeep extension."
            badge={settings.clipboard_monitoring ? 'Active' : 'Off'}
            badgeColor={settings.clipboard_monitoring ? 'green' : 'gray'}
          >
            <Toggle
              enabled={settings.clipboard_monitoring}
              onChange={(enabled) => handleToggle('clipboard_monitoring', enabled)}
            />
          </SettingRow>
        </SettingsSection>

        {/* AI Features Section */}
        <SettingsSection
          icon={<Sparkles className="h-5 w-5" />}
          title="AI Features"
          description="Configure how AI organizes your content"
          gradient="from-primary-500 to-primary-600"
        >
          <SettingRow
            icon={<Sparkles className="h-5 w-5 text-primary-500" />}
            title="Auto-categorize"
            description="Automatically categorize and tag new items using AI. Items will be organized into categories like Articles, Design, Recipes, etc."
          >
            <Toggle
              enabled={settings.auto_categorize}
              onChange={(enabled) => handleToggle('auto_categorize', enabled)}
            />
          </SettingRow>
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection
          icon={<Palette className="h-5 w-5" />}
          title="Appearance"
          description="Customize how CogniKeep looks"
          gradient="from-accent-500 to-accent-600"
        >
          <SettingRow
            icon={resolvedTheme === 'dark' ? <Moon className="h-5 w-5 text-primary-500" /> : <Sun className="h-5 w-5 text-accent-500" />}
            title="Theme"
            description="Choose your preferred color scheme"
          >
            <div className="flex items-center gap-1 p-1 bg-warm-100 dark:bg-warm-800 rounded-xl">
              <button
                onClick={() => {
                  setTheme('light')
                  setSettings((s) => ({ ...s, theme: 'light' }))
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-white dark:bg-warm-700 text-warm-900 dark:text-warm-50 shadow-sm'
                    : 'text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => {
                  setTheme('dark')
                  setSettings((s) => ({ ...s, theme: 'dark' }))
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-warm-700 text-warm-900 dark:text-warm-50 shadow-sm'
                    : 'text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
            </div>
          </SettingRow>
        </SettingsSection>

        {/* Privacy Section */}
        <SettingsSection
          icon={<Shield className="h-5 w-5" />}
          title="Privacy"
          description="Your data, your control"
          gradient="from-emerald-500 to-emerald-600"
        >
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-warm-900 dark:text-warm-50 mb-1">On-device AI Processing</h4>
                <p className="text-sm text-warm-500 dark:text-warm-400">
                  CogniKeep processes your content locally using AI that runs in your browser.
                  Your data never leaves your device for categorization.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl text-sm animate-fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' && <Check className="h-4 w-4" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsSection({
  icon,
  title,
  description,
  gradient,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 overflow-hidden shadow-soft">
      <div className="px-5 py-4 bg-warm-50 dark:bg-warm-800/50 border-b border-warm-200 dark:border-warm-800">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white`}>
            {icon}
          </div>
          <div>
            <h2 className="font-semibold text-warm-900 dark:text-warm-50">{title}</h2>
            <p className="text-xs text-warm-500 dark:text-warm-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-warm-100 dark:divide-warm-800">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  icon,
  title,
  description,
  badge,
  badgeColor,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeColor?: 'green' | 'gray'
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between p-5 gap-4">
      <div className="flex gap-4 min-w-0">
        <div className="w-10 h-10 bg-warm-100 dark:bg-warm-800 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-warm-900 dark:text-warm-50">{title}</h3>
            {badge && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                badgeColor === 'green'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-warm-100 dark:bg-warm-800 text-warm-500 dark:text-warm-400'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-warm-500 dark:text-warm-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary-600 dark:bg-primary-500' : 'bg-warm-200 dark:bg-warm-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
