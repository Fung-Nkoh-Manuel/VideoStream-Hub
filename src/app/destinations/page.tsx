'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Button, SectionHeading, EmptyState, PlatformIcon } from '@/components/ui'
import { PLATFORM_CONFIG, PlatformKey } from '@/lib/platform-connectors'
import { Plus, Users, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

interface DestinationUI {
  id: string
  platform: PlatformKey
  accountName?: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'SETUP_REQUIRED'
}

const GROUPS: Array<{ id: string; name: string; memberIds: string[] }> = []

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<DestinationUI[]>([])
  const [configuredPlatforms, setConfiguredPlatforms] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const loadDestinations = async () => {
    try {
      const res = await fetch('/api/destinations')
      if (res.ok) {
        const data = await res.json()
        setDestinations(data.destinations || [])
        if (data.configuredPlatforms) {
          setConfiguredPlatforms(data.configuredPlatforms)
        }
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadDestinations()
  }, [])

  const isConfigured = (key: PlatformKey): boolean => {
    return Boolean(configuredPlatforms[key])
  }

  const handleConnect = async (platform: PlatformKey) => {
    if (platform === 'YOUTUBE') {
      window.location.href = '/api/destinations/youtube/auth'
    } else if (platform === 'FACEBOOK') {
      window.location.href = '/api/destinations/facebook/auth'
    } else {
      alert(`OAuth flow for ${PLATFORM_CONFIG[platform]?.label || platform} will open here.`)
    }
  }

  const handleDisconnect = async (id: string, platform: PlatformKey) => {
    if (!confirm(`Are you sure you want to disconnect ${PLATFORM_CONFIG[platform]?.label || platform}?`)) return
    try {
      const res = await fetch(`/api/destinations?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadDestinations()
      }
    } catch {}
  }

  const platformCards = (Object.keys(PLATFORM_CONFIG) as PlatformKey[]).map((key) => {
    const connected = destinations.find((d) => d.platform === key)
    const configured = isConfigured(key)

    let status: DestinationUI['status'] = 'DISCONNECTED'
    if (connected) status = 'CONNECTED'
    else if (!configured) status = 'SETUP_REQUIRED'

    return {
      id: connected?.id || key,
      platform: key,
      accountName: connected?.accountName,
      status
    }
  })

  function ConnectionLabel({ status }: { status: DestinationUI['status'] }) {
    if (status === 'CONNECTED') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={14} /> Connected
        </span>
      )
    }
    if (status === 'SETUP_REQUIRED') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <AlertTriangle size={14} /> Setup required
        </span>
      )
    }
    return <span className="text-xs font-medium text-slate-400">Not connected</span>
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">Connected Destinations</h1>
        <p className="mt-1 text-sm text-slate-500">Connect platforms once; VideoStream Hub handles authentication and live streaming for you.</p>
      </div>

      {!mounted || loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading destinations...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformCards.map((d) => {
            const config = PLATFORM_CONFIG[d.platform]
            return (
              <Card key={d.platform} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-ink-800">
                        <PlatformIcon platform={d.platform} size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">{config.label}</p>
                        {d.accountName ? (
                          <p className="text-xs font-medium text-teal-600">{d.accountName}</p>
                        ) : (
                          <p className="text-xs text-slate-400">{config.label} account</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Connect {config.label} to stream live or publish content across your channels.</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <ConnectionLabel status={d.status} />
                  {d.status === 'CONNECTED' ? (
                    <div className="flex items-center gap-2">
                      {d.platform === 'YOUTUBE' && (
                        <Button variant="outline" size="sm" onClick={() => handleConnect(d.platform)}>
                          <RefreshCw size={12} className="mr-1" /> Reconnect
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(d.id, d.platform)}>Disconnect</Button>
                    </div>
                  ) : d.status === 'SETUP_REQUIRED' ? (
                    <Button variant="outline" size="sm" disabled title="Awaiting API credentials — see .env">Setup required</Button>
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
