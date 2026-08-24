'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, SectionHeading, StatusPill, PlatformChip, ProgressBar } from '@/components/ui'
import { formatBytes, formatDuration, formatRelativeTime, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { UploadCloud, Radio, CalendarPlus, Share2, Film, HardDrive, Users, Clock } from 'lucide-react'

interface DashboardData {
  metrics: {
    connectedCount: number
    totalPlatforms: number
    totalVideos: number
    upcomingScheduledCount: number
    activeLiveStream: { title: string } | null
    storageUsedBytes: number
    storageLimitBytes: number
  }
  recentVideos: Array<{ id: string; title: string; durationSeconds: number; uploadedAt: string; sizeBytes: number; status: any }>
  recentActivity: Array<{ id: string; message: string; status: any; platform?: any; createdAt: string }>
  upcoming: Array<{ id: string; title: string; scheduledAt: string; platforms: any[] }>
  destinations: Array<{ id: string; platform: any; status: string }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const metrics = data?.metrics || {
    connectedCount: 0,
    totalPlatforms: 7,
    totalVideos: 0,
    upcomingScheduledCount: 0,
    activeLiveStream: null,
    storageUsedBytes: 0,
    storageLimitBytes: 5 * 1024 * 1024 * 1024
  }

  const recentVideos = data?.recentVideos || []
  const recentActivity = data?.recentActivity || []
  const upcoming = data?.upcoming || []
  const destinations = data?.destinations || []

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening across your channels.</p>
        </div>
      </div>

      {/* Quick actions — the four core actions, visually obvious */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href="/upload" Icon={UploadCloud} label="Upload video" tone="bg-teal-500" />
        <QuickAction href="/live" Icon={Radio} label="Go live" tone="bg-live" />
        <QuickAction href="/schedule" Icon={CalendarPlus} label="Schedule" tone="bg-amber-500" />
        <QuickAction href="/destinations" Icon={Share2} label="Connect platform" tone="bg-ink-800" />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard Icon={Share2} label="Connected platforms" value={`${metrics.connectedCount} / ${metrics.totalPlatforms}`} />
        <StatCard Icon={Film} label="Total videos" value={String(metrics.totalVideos)} />
        <StatCard Icon={Clock} label="Upcoming scheduled" value={String(metrics.upcomingScheduledCount)} />
        <StatCard Icon={Users} label="Active live stream" value={metrics.activeLiveStream ? 'Live now' : 'None'} accent={metrics.activeLiveStream ? 'text-live' : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <SectionHeading title="Recent videos" action={<Link href="/videos" className="text-sm font-semibold text-teal-600 hover:underline">View all</Link>} />
            {loading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading videos...</p>
            ) : recentVideos.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No videos uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentVideos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                    <div className="flex h-12 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-ink-800 text-[10px] font-semibold text-white">{formatDuration(v.durationSeconds)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{v.title}</p>
                      <p className="text-xs text-slate-400">{formatRelativeTime(v.uploadedAt)} · {formatBytes(v.sizeBytes)}</p>
                    </div>
                    <StatusPill status={v.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeading title="Recent activity" action={<Link href="/activity" className="text-sm font-semibold text-teal-600 hover:underline">View all</Link>} />
            {loading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading activity...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <StatusPill status={a.status} label="" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-800">{a.message}</p>
                      <p className="text-xs text-slate-400">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionHeading title="Storage" />
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-500"><HardDrive size={14} /> Used</span>
              <span className="font-semibold text-ink-800">{formatBytes(metrics.storageUsedBytes)} / {formatBytes(metrics.storageLimitBytes)}</span>
            </div>
            <ProgressBar value={metrics.storageUsedBytes} max={metrics.storageLimitBytes} tone="teal" />
          </Card>

          <Card>
            <SectionHeading title="Upcoming" action={<Link href="/schedule" className="text-sm font-semibold text-teal-600 hover:underline">Calendar</Link>} />
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-sm font-medium text-ink-800">{s.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(s.scheduledAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.platforms.map((p) => <PlatformChip key={p} platform={p} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeading title="Connected platforms" action={<Link href="/destinations" className="text-sm font-semibold text-teal-600 hover:underline">Manage</Link>} />
            <div className="flex flex-wrap gap-2">
              {destinations.map((d) => (
                <PlatformChip key={d.id} platform={d.platform} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function QuickAction({ href, Icon, label, tone }: { href: string; Icon: any; label: string; tone: string }) {
  return (
    <Link href={href} className={`focus-ring flex flex-col items-start gap-3 rounded-2xl ${tone} p-4 text-white shadow-card transition-transform hover:-translate-y-0.5`}>
      <Icon size={20} />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  )
}

function StatCard({ Icon, label, value, accent }: { Icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 text-slate-400"><Icon size={15} /><span className="text-xs font-medium">{label}</span></div>
      <p className={`mt-2 text-xl font-bold ${accent ?? 'text-ink-800'}`}>{value}</p>
    </Card>
  )
}
