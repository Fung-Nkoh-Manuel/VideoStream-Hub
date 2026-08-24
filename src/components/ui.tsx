import { PlatformKey, ConnectionStatus } from '@/lib/types'
import { Youtube, Facebook, Twitch, Linkedin, Radio, Music2 } from 'lucide-react'
import clsx from 'clsx'

export const PLATFORM_META: Record<PlatformKey, { label: string; color: string; Icon: any }> = {
  YOUTUBE: { label: 'YouTube', color: '#FF0000', Icon: Youtube },
  TIKTOK: { label: 'TikTok', color: '#111827', Icon: Music2 },
  FACEBOOK: { label: 'Facebook', color: '#1877F2', Icon: Facebook },
  TWITCH: { label: 'Twitch', color: '#9146FF', Icon: Twitch },
  LINKEDIN: { label: 'LinkedIn', color: '#0A66C2', Icon: Linkedin },
  X: { label: 'X', color: '#111827', Icon: Radio },
  CUSTOM_RTMP: { label: 'Custom RTMP', color: '#64748B', Icon: Radio }
}

export function PlatformIcon({ platform, size = 16 }: { platform: PlatformKey; size?: number }) {
  const meta = PLATFORM_META[platform]
  const Icon = meta.Icon
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{ width: size + 12, height: size + 12, background: `${meta.color}1A`, color: meta.color }}
      title={meta.label}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  )
}

export function PlatformChip({ platform }: { platform: PlatformKey }) {
  const meta = PLATFORM_META[platform]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-ink-700">
      <PlatformIcon platform={platform} size={12} />
      {meta.label}
    </span>
  )
}

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: 'bg-ok/10 text-ok',
  READY: 'bg-ok/10 text-ok',
  PUBLISHED: 'bg-ok/10 text-ok',
  SUCCESS: 'bg-ok/10 text-ok',
  COMPLETED: 'bg-ok/10 text-ok',
  LIVE: 'bg-live/10 text-live',
  ERROR: 'bg-live/10 text-live',
  FAILED: 'bg-live/10 text-live',
  WARNING: 'bg-amber-500/10 text-amber-600',
  EXPIRED: 'bg-amber-500/10 text-amber-600',
  SCHEDULED: 'bg-teal-500/10 text-teal-600',
  PROCESSING: 'bg-amber-500/10 text-amber-600',
  PREPARING: 'bg-amber-500/10 text-amber-600',
  PARTIALLY_PUBLISHED: 'bg-amber-500/10 text-amber-600',
  UPLOADING: 'bg-teal-500/10 text-teal-600',
  DRAFT: 'bg-slate-100 text-slate-500',
  NOT_CONNECTED: 'bg-slate-100 text-slate-500',
  SETUP_REQUIRED: 'bg-slate-100 text-slate-500',
  CONNECTING: 'bg-teal-500/10 text-teal-600',
  CANCELLED: 'bg-slate-100 text-slate-500'
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const dotLive = status === 'LIVE'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-500')}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', dotLive && 'animate-pulse-live')} style={{ background: 'currentColor' }} />
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

export function ConnectionLabel({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, string> = {
    CONNECTED: 'Connected',
    NOT_CONNECTED: 'Not connected',
    CONNECTING: 'Connecting…',
    EXPIRED: 'Connection expired',
    ERROR: 'Connection error',
    SETUP_REQUIRED: 'Setup required'
  }
  return <StatusPill status={status} label={map[status]} />
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-100 bg-white p-5 shadow-card', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{eyebrow}</p>}
        <h2 className="text-lg font-semibold text-ink-800">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  const variants = {
    primary: 'bg-ink-800 text-white hover:bg-ink-700',
    secondary: 'bg-teal-500 text-white hover:bg-teal-600',
    outline: 'border border-slate-200 text-ink-800 hover:bg-slate-50',
    danger: 'bg-live text-white hover:bg-red-600',
    ghost: 'text-ink-700 hover:bg-slate-100'
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' }
  return (
    <button
      className={clsx('focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, max, tone = 'teal' }: { value: number; max: number; tone?: 'teal' | 'amber' | 'live' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const colors = { teal: 'bg-teal-500', amber: 'bg-amber-500', live: 'bg-live' }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={clsx('h-full rounded-full transition-all', colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}
