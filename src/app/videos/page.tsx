'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, StatusPill, PlatformChip, Button, EmptyState } from '@/components/ui'
import { formatBytes, formatDuration, formatRelativeTime } from '@/lib/utils'
import { Search, MoreVertical, Play, Pencil, Send, CalendarClock, Copy, Trash2, History, AlertCircle, CheckCircle2, ExternalLink, Radio } from 'lucide-react'
import Link from 'next/link'

interface PublishJobUI {
  id: string
  status: string
  platform: string
  platformPostId?: string
  platformPostUrl?: string
  errorMessage?: string
  publishedAt?: string | null
  createdAt: string
}

interface VideoItem {
  id: string
  _id?: string
  title: string
  description?: string
  thumbnailUrl: string
  durationSeconds: number
  uploadedAt: string
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
  publishStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED'
  platforms: any[]
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  sizeBytes: number
  originalFileUrl?: string
  publishJobs?: PublishJobUI[]
}

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'FAILED', label: 'Failed' }
] as const

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null)
  const [selectedHistoryVideo, setSelectedHistoryVideo] = useState<VideoItem | null>(null)

  const loadVideos = async () => {
    try {
      const res = await fetch('/api/videos')
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handlePublishToYouTube = async (video: VideoItem) => {
    setOpenMenu(null)
    setPublishingId(video.id)
    setFeedback(null)

    try {
      const res = await fetch('/api/videos/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id })
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to publish to YouTube.'
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Successfully published "${video.title}" to YouTube!`,
          url: data.publishJob?.platformPostUrl
        })
        await loadVideos()
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred while publishing.'
      })
    } finally {
      setPublishingId(null)
    }
  }

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const matchesQuery = v.title.toLowerCase().includes(query.toLowerCase())
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'PROCESSING' && v.status === 'PROCESSING') ||
        (filter === 'FAILED' && (v.status === 'FAILED' || v.publishStatus === 'FAILED')) ||
        (filter !== 'PROCESSING' && filter !== 'FAILED' && v.publishStatus === filter)
      return matchesQuery && matchesFilter
    })
  }, [videos, query, filter])

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">My Videos</h1>
          <p className="mt-1 text-sm text-slate-500">{videos.length} videos in your library</p>
        </div>
        <Link href="/upload"><Button>Upload video</Button></Link>
      </div>

      {feedback && (
        <Card className={`mb-6 flex items-center justify-between gap-3 ${feedback.type === 'success' ? '!border-emerald-200 !bg-emerald-50 text-emerald-800' : '!border-red-200 !bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {feedback.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          {feedback.url && (
            <a href={feedback.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
              View on YouTube <ExternalLink size={12} />
            </a>
          )}
        </Card>
      )}

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

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading videos...</div>
      ) : filtered.length === 0 ? (
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
                  <div className="absolute right-2 top-9 z-10 w-52 rounded-xl border border-slate-100 bg-white py-1.5 text-left shadow-card">
                    <Link href={`/live?videoId=${v.id}`} onClick={() => setOpenMenu(null)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-slate-50">
                      <Radio size={13} className="text-red-500" /> Go Live with Video
                    </Link>
                    <button onClick={() => handlePublishToYouTube(v)} disabled={publishingId === v.id} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-slate-50">
                      <Send size={13} className="text-teal-600" /> {publishingId === v.id ? 'Publishing to YouTube...' : 'Publish to YouTube'}
                    </button>
                    <button onClick={() => { setOpenMenu(null); setSelectedHistoryVideo(v) }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink-700 hover:bg-slate-50">
                      <History size={13} /> View history
                    </button>
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

      {selectedHistoryVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-base font-semibold text-ink-800">Publishing History</h2>
            <p className="text-xs text-slate-500 mt-0.5">{selectedHistoryVideo.title}</p>

            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {!selectedHistoryVideo.publishJobs || selectedHistoryVideo.publishJobs.length === 0 ? (
                <p className="text-xs text-slate-400">No publishing history recorded yet.</p>
              ) : (
                selectedHistoryVideo.publishJobs.map((j) => (
                  <div key={j.id} className="rounded-xl border border-slate-100 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <PlatformChip platform={j.platform as any} />
                      <StatusPill status={j.status as any} />
                    </div>
                    {j.platformPostUrl && (
                      <a href={j.platformPostUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 font-medium text-teal-600 hover:underline">
                        View Post <ExternalLink size={11} />
                      </a>
                    )}
                    {j.errorMessage && <p className="mt-2 text-red-500">{j.errorMessage}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedHistoryVideo(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
