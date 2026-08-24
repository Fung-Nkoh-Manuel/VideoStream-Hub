'use client'

import { useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, StatusPill, PlatformChip, Button, EmptyState } from '@/components/ui'
import { mockVideos } from '@/lib/mock-data'
import { formatBytes, formatDuration, formatRelativeTime } from '@/lib/utils'
import { Search, MoreVertical, Play, Pencil, Send, CalendarClock, Copy, Trash2, History } from 'lucide-react'
import Link from 'next/link'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'FAILED', label: 'Failed' }
] as const

export default function VideosPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return mockVideos.filter((v) => {
      const matchesQuery = v.title.toLowerCase().includes(query.toLowerCase())
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'PROCESSING' && v.status === 'PROCESSING') ||
        (filter === 'FAILED' && (v.status === 'FAILED' || v.publishStatus === 'FAILED')) ||
        (filter !== 'PROCESSING' && filter !== 'FAILED' && v.publishStatus === filter)
      return matchesQuery && matchesFilter
    })
  }, [query, filter])

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">My Videos</h1>
          <p className="mt-1 text-sm text-slate-500">{mockVideos.length} videos in your library</p>
        </div>
        <Link href="/upload"><Button>Upload video</Button></Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos"
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`focus-ring flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? 'bg-ink-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No videos found" body="Try a different search or filter, or upload your first video to get started." action={<Link href="/upload"><Button>Upload video</Button></Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Card key={v.id} className="relative !p-0 overflow-hidden">
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-ink-800 to-ink-700">
                <Play className="text-white/70" size={28} />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">{formatDuration(v.durationSeconds)}</span>
                <div className="absolute left-2 top-2"><StatusPill status={v.status} /></div>
                <button
                  onClick={() => setOpenMenu(openMenu === v.id ? null : v.id)}
                  className="focus-ring absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
                  aria-label="More actions"
                >
                  <MoreVertical size={14} />
                </button>
                {openMenu === v.id && (
                  <div className="absolute right-2 top-9 z-10 w-44 rounded-xl border border-slate-100 bg-white py-1.5 text-left shadow-card">
                    {[
                      { Icon: Pencil, label: 'Edit details' },
                      { Icon: Send, label: 'Publish' },
                      { Icon: CalendarClock, label: 'Schedule' },
                      { Icon: Copy, label: 'Duplicate' },
                      { Icon: History, label: 'View history' },
                      { Icon: Trash2, label: 'Delete' }
                    ].map(({ Icon, label }) => (
                      <button key={label} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink-700 hover:bg-slate-50">
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-semibold text-ink-800">{v.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(v.uploadedAt)} · {formatBytes(v.sizeBytes)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <StatusPill status={v.publishStatus} />
                  <div className="flex -space-x-1.5">
                    {v.platforms.map((p) => <PlatformChip key={p} platform={p} />)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
