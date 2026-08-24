'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Film,
  UploadCloud,
  Radio,
  CalendarDays,
  Share2,
  BarChart3,
  Bell,
  Settings,
  Plus,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import clsx from 'clsx'
import Logo from './Logo'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/videos', label: 'My Videos', Icon: Film },
  { href: '/upload', label: 'Upload', Icon: UploadCloud },
  { href: '/live', label: 'Live Studio', Icon: Radio },
  { href: '/schedule', label: 'Schedule', Icon: CalendarDays },
  { href: '/destinations', label: 'Destinations', Icon: Share2 },
  { href: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/activity', label: 'Activity', Icon: Bell },
  { href: '/settings', label: 'Settings', Icon: Settings }
]

// Bottom nav keeps the four highest-frequency destinations within a thumb's reach.
const MOBILE_PRIMARY = ['/dashboard', '/videos', '/live', '/destinations']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-ink-800 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-ink-800'
                )}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 space-y-2">
          <Link href="/upload" className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600">
            <Plus size={16} /> Upload video
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 lg:hidden">
        <Logo compact />
        <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-ink-800">
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile full menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="ml-auto flex h-full w-72 flex-col bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Logo compact />
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="focus-ring rounded-lg p-2">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map(({ href, label, Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      'focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      active ? 'bg-ink-800 text-white' : 'text-slate-600'
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-auto border-t border-slate-100 pt-3">
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/login' }) }}
                className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="pb-20 lg:pb-8 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav — thumb-reachable primary actions */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-slate-100 bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={clsx('focus-ring flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-ink-800' : 'text-slate-400')}>
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label === 'Live Studio' ? 'Live' : label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
