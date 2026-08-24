'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, SectionHeading, Button, ProgressBar, PlatformIcon } from '@/components/ui'
import { mockDashboard, mockDestinations } from '@/lib/mock-data'
import { formatBytes } from '@/lib/utils'

const TABS = ['Profile', 'Connected accounts', 'Notifications', 'Security', 'Storage', 'Subscription'] as const

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Profile')

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your account, connections, and preferences.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`focus-ring flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === t ? 'bg-ink-800 text-white' : 'border border-slate-200 bg-white text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 max-w-2xl">
        {tab === 'Profile' && (
          <Card>
            <SectionHeading title="Profile" />
            <div className="space-y-3">
              <Field label="Name" defaultValue="Your Brother" />
              <Field label="Email" defaultValue="you@example.com" type="email" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Profile image</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-ink-800" />
                  <Button variant="outline" size="sm">Change photo</Button>
                </div>
              </div>
              <Button className="mt-2">Save changes</Button>
            </div>
          </Card>
        )}

        {tab === 'Connected accounts' && (
          <Card>
            <SectionHeading title="Connected accounts" />
            <div className="space-y-2">
              {mockDestinations.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-ink-800"><PlatformIcon platform={d.platform} size={14} /> {d.accountName ?? d.platform}</span>
                  <span className="text-xs text-slate-400">{d.status === 'CONNECTED' ? 'Connected' : 'Not connected'}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Manage full connection details from the Destinations page.</p>
          </Card>
        )}

        {tab === 'Notifications' && (
          <Card>
            <SectionHeading title="Notifications" />
            <div className="space-y-3">
              {['Upload completed', 'Publishing successful / failed', 'Schedule approaching', 'Stream started / ended', 'Platform authorization expired'].map((n) => (
                <label key={n} className="flex items-center justify-between text-sm text-ink-800">
                  {n}
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
                </label>
              ))}
            </div>
          </Card>
        )}

        {tab === 'Security' && (
          <Card>
            <SectionHeading title="Security" />
            <div className="space-y-3">
              <Field label="Current password" type="password" />
              <Field label="New password" type="password" />
              <Button>Update password</Button>
            </div>
          </Card>
        )}

        {tab === 'Storage' && (
          <Card>
            <SectionHeading title="Storage" />
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500">Used</span>
              <span className="font-semibold text-ink-800">{formatBytes(mockDashboard.storageUsedBytes)} / {formatBytes(mockDashboard.storageLimitBytes)}</span>
            </div>
            <ProgressBar value={mockDashboard.storageUsedBytes} max={mockDashboard.storageLimitBytes} tone="teal" />
            <p className="mt-3 text-xs text-slate-400">Manage individual files from My Videos.</p>
          </Card>
        )}

        {tab === 'Subscription' && (
          <Card>
            <SectionHeading title="Subscription" />
            <p className="text-sm text-slate-500">You're on the <strong className="text-ink-800">Free</strong> plan. Paid plans with more storage and destinations are coming later.</p>
            <Button variant="outline" className="mt-4" disabled>Upgrade — coming later</Button>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

function Field({ label, defaultValue, type = 'text' }: { label: string; defaultValue?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <input type={type} defaultValue={defaultValue} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
    </div>
  )
}
