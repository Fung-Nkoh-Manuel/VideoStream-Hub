'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, SectionHeading, ConnectionLabel, PlatformIcon, Button, EmptyState } from '@/components/ui'
import { PLATFORM_META } from '@/components/ui'
import { PlatformKey, DestinationItem } from '@/lib/types'
import { Plus, Settings2, Users } from 'lucide-react'
import { PLATFORM_CONFIG, isPlatformConfigured } from '@/lib/platform-connectors'

const GROUPS = [{ id: 'g1', name: 'Sunday Service', memberIds: ['d1', 'd2'] }]

const ALL_PLATFORMS: PlatformKey[] = ['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'X', 'CUSTOM_RTMP']

export default function DestinationsPage() {
  const [dbDestinations, setDbDestinations] = useState<DestinationItem[]>([])
  const [loading, setLoading] = useState(true)
  // Prevent hydration mismatch: isPlatformConfigured reads process.env which
  // differs between the SSR pass (env vars present) and the client hydration
  // pass (env vars absent). We defer all env-dependent rendering until after
  // the component has mounted on the client.
  const [mounted, setMounted] = useState(false)

  const loadDestinations = async () => {
    try {
      const res = await fetch('/api/destinations')
      if (res.ok) {
        const data = await res.json()
        setDbDestinations(data.destinations || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadDestinations()
  }, [])

  const handleConnect = async (platform: PlatformKey) => {
    try {
      const res = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      })
      const data = await res.json()
      if (data.nextStep) {
        window.location.href = data.nextStep
      } else {
        await loadDestinations()
      }
    } catch {}
  }

  const handleDisconnect = async (id?: string, platform?: PlatformKey) => {
    try {
      const query = id ? `id=${id}` : `platform=${platform}`
      await fetch(`/api/destinations?${query}`, { method: 'DELETE' })
      await loadDestinations()
    } catch {}
  }

  const platformCards = ALL_PLATFORMS.map((platform) => {
    const existing = dbDestinations.find((d) => d.platform === platform)
    if (existing) {
      return {
        id: existing.id || (existing as any)._id,
        platform,
        accountName: existing.accountName,
        status: existing.status
      }
    }
    const configured = isPlatformConfigured(platform)
    return {
      id: platform,
      platform,
      accountName: null,
      status: configured ? ('NOT_CONNECTED' as const) : ('SETUP_REQUIRED' as const)
    }
  })

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">Destinations</h1>
          <p className="mt-1 text-sm text-slate-500">Connect the platforms you publish to. Multiple accounts per platform are supported.</p>
        </div>
      </div>

      <SectionHeading title="Platforms" />
      {!mounted ? (
        // Identical on server and client — prevents hydration mismatch from
        // isPlatformConfigured() reading process.env differently in each pass.
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_PLATFORMS.map((p) => (
            <Card key={p} className="animate-pulse !p-5">
              <div className="h-5 w-3/4 rounded-lg bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 rounded-lg bg-slate-100" />
              <div className="mt-4 h-8 w-full rounded-xl bg-slate-100" />
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformCards.map((d) => {
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
                  <Button variant="outline" size="sm" onClick={() => handleDisconnect(d.id, d.platform)}>Disconnect</Button>
                ) : d.status === 'SETUP_REQUIRED' ? (
                  <Button variant="outline" size="sm" disabled title="Awaiting API credentials — see .env.example">Setup required</Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect(d.platform)}><Plus size={13} /> Connect</Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      )}

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
                    const dest = platformCards.find((d) => d.id === id)
                    if (!dest) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-ink-700">
                        <PlatformIcon platform={dest.platform} size={12} /> {dest.accountName || dest.platform}
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
