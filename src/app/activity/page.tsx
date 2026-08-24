'use client'

import { useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, StatusPill, PlatformChip, EmptyState } from '@/components/ui'
import { mockActivity } from '@/lib/mock-data'
import { formatDateTime } from '@/lib/utils'

const STATUS_FILTERS = ['ALL', 'SUCCESS', 'WARNING', 'ERROR'] as const

export default function ActivityPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL')

  const filtered = useMemo(
    () => mockActivity.filter((a) => statusFilter === 'ALL' || a.status === statusFilter),
    [statusFilter]
  )

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Activity</h1>
      <p className="mt-1 text-sm text-slate-500">Every upload, publish, and stream event in one timeline.</p>

      <div className="mt-5 flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-semibold ${statusFilter === s ? 'bg-ink-800 text-white' : 'border border-slate-200 bg-white text-slate-500'}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState title="No activity" body="Nothing matches this filter yet." />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((a) => (
              <Card key={a.id} className="flex items-center justify-between !py-3">
                <div className="flex items-center gap-3">
                  <StatusPill status={a.status} label="" />
                  <div>
                    <p className="text-sm text-ink-800">{a.message}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
                  </div>
                </div>
                {a.platform && <PlatformChip platform={a.platform} />}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
