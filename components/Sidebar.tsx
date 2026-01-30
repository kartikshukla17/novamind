'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, LayoutGrid, FolderKanban, Tags, Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'All Items', href: '/all', icon: LayoutGrid, color: 'text-primary-500' },
  { name: 'Boards', href: '/boards', icon: FolderKanban, color: 'text-accent-500' },
  { name: 'Categorized', href: '/categorized', icon: Tags, color: 'text-emerald-500' },
  { name: 'Settings', href: '/settings', icon: Settings, color: 'text-warm-500' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-warm-800 border-r border-warm-200 dark:border-warm-700 hidden lg:flex lg:flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <Link href="/all" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-lg transition-all">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-400 rounded-full animate-pulse-soft" />
          </div>
          <span className="text-xl font-bold text-warm-900 dark:text-warm-50">Novamind</span>
        </Link>
      </div>

      {/* AI Status Badge */}
      <div className="mx-4 mb-4 p-3 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-500 dark:text-primary-400" />
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">AI Ready</span>
        </div>
        <p className="text-xs text-primary-600/70 dark:text-primary-400/70 mt-1">
          Auto-organize enabled
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-warm-400 dark:text-warm-500 uppercase tracking-wider">
          Navigation
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-700 hover:text-warm-900 dark:hover:text-warm-50'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                isActive
                  ? 'bg-primary-100 dark:bg-primary-800/50'
                  : 'bg-warm-100 dark:bg-warm-700 group-hover:bg-warm-200 dark:group-hover:bg-warm-600'
              )}>
                <item.icon className={cn(
                  'h-4 w-4',
                  isActive ? 'text-primary-600 dark:text-primary-400' : item.color
                )} />
              </div>
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-warm-200 dark:border-warm-700">
        <div className="p-4 bg-gradient-to-br from-primary-500/10 to-accent-500/10 dark:from-primary-500/20 dark:to-accent-500/20 rounded-xl">
          <h4 className="font-semibold text-warm-900 dark:text-warm-50 mb-1">
            Your Second Brain
          </h4>
          <p className="text-xs text-warm-600 dark:text-warm-400">
            Save anything, find everything. AI handles the organization.
          </p>
        </div>
      </div>
    </aside>
  )
}
