'use client'

import AppShell from '@/components/AppShell'
import { Card, SectionHeading, PlatformChip } from '@/components/ui'
import { PLATFORM_META } from '@/components/ui'
import { mockAnalytics } from '@/lib/mock-data'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

export default function AnalyticsPage() {
  const { totals, byPlatform, viewsOverTime } = mockAnalytics

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Performance across every connected platform, combined.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total views" value={totals.views.toLocaleString()} />
        <MetricCard label="Likes" value={totals.likes.toLocaleString()} />
        <MetricCard label="Comments" value={totals.comments.toLocaleString()} />
        <MetricCard label="Shares" value={totals.shares.toLocaleString()} />
        <MetricCard label="Watch time" value={`${totals.watchTimeHours} hrs`} />
      </div>

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
              <Line type="monotone" dataKey="YOUTUBE" stroke="#FF0000" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TIKTOK" stroke="#111827" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="FACEBOOK" stroke="#1877F2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mt-6">
        <SectionHeading title="Platform comparison" />
        <div className="grid gap-4 sm:grid-cols-3">
          {byPlatform.map((p) => (
            <Card key={p.platform}>
              <PlatformChip platform={p.platform} />
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
      <p className="mt-6 text-xs text-slate-400">
        Analytics for a platform only appear once it's connected and has published content — nothing here is estimated for platforms you haven't connected yet.
      </p>
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
