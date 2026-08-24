'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, SectionHeading, PlatformChip, EmptyState, Button } from '@/components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import Link from 'next/link'

interface AnalyticsData {
  totals: { views: number; likes: number; comments: number; shares: number; watchTimeHours: number }
  byPlatform: Array<{ platform: string; views: number; likes: number; comments: number; followers: number }>
  viewsOverTime: Array<Record<string, string | number>>
  hasData: boolean
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/analytics')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [])

  const totals = data?.totals || { views: 0, likes: 0, comments: 0, shares: 0, watchTimeHours: 0 }
  const byPlatform = data?.byPlatform || []
  const viewsOverTime = data?.viewsOverTime || []
  const hasData = data?.hasData ?? false

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Performance across every connected platform, combined.</p>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading analytics...</div>
      ) : !hasData ? (
        <div className="mt-8">
          <EmptyState
            title="No analytics data yet"
            body="Analytics will appear here once you've connected a platform and published content. Data is collected automatically."
            action={<Link href="/destinations"><Button>Connect a platform</Button></Link>}
          />
          <p className="mt-4 text-center text-xs text-slate-400">
            Analytics for a platform only appear once it's connected and has published content — nothing is fabricated.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard label="Total views" value={totals.views.toLocaleString()} />
            <MetricCard label="Likes" value={totals.likes.toLocaleString()} />
            <MetricCard label="Comments" value={totals.comments.toLocaleString()} />
            <MetricCard label="Shares" value={totals.shares.toLocaleString()} />
            <MetricCard label="Watch time" value={`${totals.watchTimeHours} hrs`} />
          </div>

          {viewsOverTime.length > 0 && (
            <Card className="mt-6">
              <SectionHeading title="Views over time" />
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={viewsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F4" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {byPlatform.map((p) => (
                      <Line key={p.platform} type="monotone" dataKey={p.platform} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {byPlatform.length > 0 && (
            <div className="mt-6">
              <SectionHeading title="Platform comparison" />
              <div className="grid gap-4 sm:grid-cols-3">
                {byPlatform.map((p) => (
                  <Card key={p.platform}>
                    <PlatformChip platform={p.platform as any} />
                    <div className="mt-4 space-y-2 text-sm">
                      <Row label="Views" value={p.views.toLocaleString()} />
                      <Row label="Likes" value={p.likes.toLocaleString()} />
                      <Row label="Comments" value={p.comments.toLocaleString()} />
                      <Row label="New followers" value={p.followers.toLocaleString()} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-slate-400">
            Analytics for a platform only appear once it's connected and has published content — nothing here is estimated.
          </p>
        </>
      )}
    </AppShell>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-ink-800">{value}</p>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  )
}
