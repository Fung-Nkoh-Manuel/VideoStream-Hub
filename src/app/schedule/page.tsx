'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Button, StatusPill, PlatformChip, EmptyState } from '@/components/ui'
import { ScheduledItemUI } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { Plus, Radio, Video, Repeat } from 'lucide-react'

const VIEWS = ['Day', 'Week', 'Month'] as const

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduledItemUI[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<(typeof VIEWS)[number]>('Week')
  const [selected, setSelected] = useState<string | null>(null)

  const loadSchedule = async () => {
    try {
      const res = await fetch('/api/schedule')
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.schedule || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  const sorted = [...schedule].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const item = sorted.find((s) => s.id === selected)

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Schedule</h1>
          <p className="mt-1 text-sm text-slate-500">Videos and live streams queued up across every platform.</p>
        </div>
        <Button><Plus size={15} /> New schedule</Button>
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)} className={`focus-ring rounded-lg px-4 py-1.5 ${view === v ? 'bg-white text-ink-800 shadow-card' : 'text-slate-500'}`}>
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading schedule...</div>
      ) : sorted.length === 0 ? (
        <EmptyState title="No scheduled content" body="Schedule your next video or live stream to see it here." action={<Button><Plus size={15} /> New schedule</Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {sorted.map((s) => (
              <Card
                key={s.id}
                className={`cursor-pointer transition-colors ${selected === s.id ? 'ring-2 ring-teal-500' : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                      {s.type === 'LIVE_STREAM' ? <Radio size={16} /> : s.type === 'PRERECORDED_LIVE' ? <Repeat size={16} /> : <Video size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-800">{s.title}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(s.scheduledAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.platforms.map((p) => <PlatformChip key={p} platform={p} />)}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              </Card>
            ))}
          </div>

          <div>
            {item ? (
              <Card>
                <h2 className="text-sm font-semibold text-ink-800">{item.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.scheduledAt)}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{item.platforms.map((p) => <PlatformChip key={p} platform={p} />)}</div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">Reschedule</Button>
                  <Button variant="danger" size="sm" className="flex-1">Cancel</Button>
                </div>
              </Card>
            ) : (
              <Card className="text-center text-sm text-slate-400">Select an item to see details.</Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
