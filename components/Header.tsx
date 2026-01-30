'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Search, Menu, LogOut, User as UserIcon, ChevronDown, X, Brain, LayoutGrid, FolderKanban, Tags, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: User
}

const mobileNav = [
  { name: 'All Items', href: '/all', icon: LayoutGrid },
  { name: 'Boards', href: '/boards', icon: FolderKanban },
  { name: 'Categorized', href: '/categorized', icon: Tags },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Header({ user }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/all?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-warm-800/80 backdrop-blur-xl border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileNav(true)}
              className="lg:hidden p-2 hover:bg-warm-100 dark:hover:bg-warm-700 rounded-xl transition-colors"
            >
              <Menu className="h-5 w-5 text-warm-600 dark:text-warm-300" />
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <div className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
                searchFocused ? 'text-primary-500 dark:text-primary-400' : 'text-warm-400 dark:text-warm-500'
              )}>
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search your second brain..."
                className={cn(
                  'w-72 lg:w-80 pl-10 pr-4 py-2.5 bg-warm-50 dark:bg-warm-700 rounded-xl text-sm text-warm-900 dark:text-warm-50',
                  'placeholder:text-warm-400 dark:placeholder:text-warm-500',
                  'border-2 transition-all duration-200',
                  searchFocused
                    ? 'border-primary-500 ring-4 ring-primary-500/10'
                    : 'border-transparent hover:border-warm-200 dark:hover:border-warm-600'
                )}
              />
            </form>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 hover:bg-warm-100 dark:hover:bg-warm-700 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-warm-700 dark:text-warm-200 hidden sm:block max-w-[120px] truncate">
                {user.email?.split('@')[0]}
              </span>
              <ChevronDown className={cn(
                'h-4 w-4 text-warm-400 dark:text-warm-500 transition-transform',
                showMenu && 'rotate-180'
              )} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-warm-800 rounded-xl shadow-soft-lg border border-warm-200 dark:border-warm-700 py-2 z-20 animate-scale-in">
                  <div className="px-4 py-3 border-b border-warm-100 dark:border-warm-700">
                    <p className="text-sm font-semibold text-warm-900 dark:text-warm-50 truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-warm-500 dark:text-warm-400 truncate">{user.email}</p>
                  </div>

                  <div className="pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <LogOut className="h-4 w-4" />
                      </div>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {showMobileNav && (
        <>
          <div
            className="fixed inset-0 bg-warm-900/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setShowMobileNav(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-warm-800 z-50 lg:hidden animate-slide-in-right">
            <div className="flex items-center justify-between p-6 border-b border-warm-200 dark:border-warm-700">
              <Link href="/all" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-warm-900 dark:text-warm-50">Novamind</span>
              </Link>
              <button
                onClick={() => setShowMobileNav(false)}
                className="p-2 hover:bg-warm-100 dark:hover:bg-warm-700 rounded-xl"
              >
                <X className="h-5 w-5 text-warm-500 dark:text-warm-400" />
              </button>
            </div>

            <nav className="p-4 space-y-1">
              {mobileNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowMobileNav(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-700'
                    )}
                  >
                    <item.icon className={cn(
                      'h-5 w-5',
                      isActive ? 'text-primary-600 dark:text-primary-400' : ''
                    )} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
