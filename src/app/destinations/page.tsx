'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, SectionHeading, ConnectionLabel, PlatformIcon, Button, EmptyState } from '@/components/ui'
import { PLATFORM_META } from '@/components/ui'
import { mockDestinations } from '@/lib/mock-data'
import { Plus, Settings2, Users } from 'lucide-react'

const GROUPS = [{ id: 'g1', name: 'Sunday Service', memberIds: ['d1', 'd2'] }]

export default function DestinationsPage() {
  const [destinations] = useState(mockDestinations)

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Destinations</h1>
          <p className="mt-1 text-sm text-slate-500">Connect the platforms you publish to. Multiple accounts per platform are supported.</p>
        </div>
      </div>

      <SectionHeading title="Platforms" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d) => {
          const meta = PLATFORM_META[d.platform]
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={d.platform} size={20} />
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{meta.label}</p>
                    <p className="text-xs text-slate-400">{d.accountName ?? 'No account connected'}</p>
                  </div>
                </div>
                {d.status === 'CONNECTED' && (
                  <button className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Settings"><Settings2 size={16} /></button>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <ConnectionLabel status={d.status} />
                {d.status === 'CONNECTED' ? (
                  <Button variant="outline" size="sm">Disconnect</Button>
                ) : d.status === 'SETUP_REQUIRED' ? (
                  <Button variant="outline" size="sm" disabled title="Awaiting API credentials — see .env.example">Setup required</Button>
                ) : (
                  <Button size="sm"><Plus size={13} /> Connect</Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-10">
        <SectionHeading
          title="Destination groups"
          action={<Button variant="outline" size="sm"><Plus size={13} /> New group</Button>}
        />
        {GROUPS.length === 0 ? (
          <EmptyState title="No groups yet" body="Group destinations like 'Sunday Service' to publish to several platforms in one click." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <Card key={g.id}>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-teal-600" />
                  <p className="text-sm font-semibold text-ink-800">{g.name}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.memberIds.map((id) => {
                    const dest = destinations.find((d) => d.id === id)
                    if (!dest) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-ink-700">
                        <PlatformIcon platform={dest.platform} size={12} /> {dest.accountName}
                      </span>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
