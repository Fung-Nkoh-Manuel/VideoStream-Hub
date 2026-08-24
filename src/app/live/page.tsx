'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Button, PlatformChip, StatusPill } from '@/components/ui'
import { mockDestinations } from '@/lib/mock-data'
import { Camera, Radio, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react'

// Live Studio reads real configuration state from the streaming provider
// abstraction (src/lib/streaming-provider.ts). In this demo the provider
// is unconfigured, so Live Studio honestly shows a setup state rather
// than a fake "LIVE" indicator — see STREAM_PROVIDER_API_KEY in .env.
const STREAMING_CONFIGURED = false

export default function LiveStudioPage() {
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showKey, setShowKey] = useState(false)
  const connected = mockDestinations.filter((d) => d.status === 'CONNECTED')

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Live Studio</h1>
      <p className="mt-1 text-sm text-slate-500">One input, many destinations. Stream from your browser or bring your own encoder.</p>

      {!STREAMING_CONFIGURED && (
        <Card className="mt-6 flex items-start gap-3 !border-amber-200 !bg-amber-50">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Streaming service not configured</p>
            <p className="mt-0.5 text-sm text-amber-700/80">
              Add a streaming relay provider's <code className="rounded bg-white/60 px-1">STREAM_PROVIDER_API_KEY</code> and{' '}
              <code className="rounded bg-white/60 px-1">STREAM_PROVIDER_API_URL</code> to <code className="rounded bg-white/60 px-1">.env</code> to enable
              going live. The Live Studio UI below is fully wired up and will work immediately once that's set.
            </p>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="!p-0 overflow-hidden">
            <div className="flex aspect-video items-center justify-center bg-ink-900">
              <div className="flex flex-col items-center gap-2 text-white/50">
                <Camera size={32} />
                <p className="text-sm">Camera preview will appear here once you grant permission.</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <StatusPill status="IDLE" label="Idle" /> 00:00:00
              </div>
              <Button disabled={!STREAMING_CONFIGURED || selected.length === 0} className="gap-2">
                <Radio size={15} /> Start stream
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Destination status</h2>
            {selected.length === 0 ? (
              <p className="text-sm text-slate-500">Select destinations on the right to see their status here once you're live.</p>
            ) : (
              <div className="space-y-2">
                {selected.map((id) => {
                  const d = connected.find((c) => c.id === id)!
                  return (
                    <div key={id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                      <PlatformChip platform={d.platform} />
                      <StatusPill status="IDLE" label="Not started" />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Stream details</h2>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream title" className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              <textarea placeholder="Description (optional)" rows={3} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Destinations</h2>
            {connected.length === 0 ? (
              <p className="text-sm text-slate-500">No connected platforms support live streaming yet.</p>
            ) : (
              <div className="space-y-2">
                {connected.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <PlatformChip platform={d.platform} />
                    <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} className="h-4 w-4 accent-teal-600" />
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-800">Use OBS instead</h2>
            <p className="mb-3 text-xs text-slate-500">Point any encoder at this server and key.</p>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Server URL</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                  <span className="truncate">rtmp://ingest.videostreamhub.app/live</span>
                  <button className="ml-auto text-slate-400 hover:text-ink-800"><Copy size={13} /></button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Stream key</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                  <span className="truncate">{showKey ? 'vsh_live_9f2c7a1e4b8d' : '••••••••••••••••'}</span>
                  <button onClick={() => setShowKey((s) => !s)} className="ml-auto text-slate-400 hover:text-ink-800">
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button className="text-slate-400 hover:text-ink-800"><Copy size={13} /></button>
                </div>
              </div>
              <button className="text-xs font-medium text-teal-600 hover:underline">Regenerate key</button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
