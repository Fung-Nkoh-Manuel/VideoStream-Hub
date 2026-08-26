'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { Card, Button, PlatformChip, StatusPill } from '@/components/ui'
import { Camera, Radio, Copy, Eye, EyeOff, AlertTriangle, AlertCircle, Film, CheckCircle2 } from 'lucide-react'
import { PLATFORM_CONFIG, PlatformKey } from '@/lib/platform-connectors'

interface Destination {
  id: string
  _id?: string
  platform: PlatformKey
  accountName?: string
}

interface VideoItem {
  id: string
  _id?: string
  title: string
  originalFileUrl?: string
  durationSeconds?: number
  sizeBytes?: number
}

export default function LiveStudioPage() {
  const searchParams = useSearchParams()
  const preselectedVideoId = searchParams.get('videoId')

  const [isConfigured, setIsConfigured] = useState(false)
  const [sourceType, setSourceType] = useState<'ENCODER' | 'PRERECORDED'>('ENCODER')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showKey, setShowKey] = useState(false)
  const [connectedDestinations, setConnectedDestinations] = useState<Destination[]>([])
  const [userVideos, setUserVideos] = useState<VideoItem[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string>(preselectedVideoId || '')
  
  const [streamId, setStreamId] = useState<string | null>(null)
  const [status, setStatus] = useState<'IDLE' | 'STARTING' | 'LIVE' | 'STOPPING' | 'ENDED' | 'ERROR'>('IDLE')
  const [destStatuses, setDestStatuses] = useState<Record<string, { status: string; errorMessage?: string }>>({})
  const [serverUrl, setServerUrl] = useState('rtmp://ingest.videostreamhub.app/live')
  const [streamKey, setStreamKey] = useState('vsh_live_9f2c7a1e4b8d')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [workerNotice, setWorkerNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const statusPollRef = useRef<NodeJS.Timeout | null>(null)

  const loadInitialState = async () => {
    try {
      const [liveRes, videoRes] = await Promise.all([
        fetch('/api/live'),
        fetch('/api/videos')
      ])

      if (liveRes.ok) {
        const data = await liveRes.json()
        setIsConfigured(data.isConfigured)

        const dests: Destination[] = (data.destinations || [])
          .filter((d: any) => {
            const platformKey = d.platform as PlatformKey
            return PLATFORM_CONFIG[platformKey]?.capabilities?.live !== false
          })
          .map((d: any) => ({
            id: d._id?.toString() || d.id,
            platform: d.platform,
            accountName: d.accountName
          }))
        setConnectedDestinations(dests)

        if (data.stream) {
          setStreamId(data.stream._id || data.stream.id)
          setTitle(data.stream.title || '')
          setDescription(data.stream.description || '')
          if (data.stream.sourceType) setSourceType(data.stream.sourceType)
          if (data.stream.videoId) setSelectedVideoId(data.stream.videoId)
          if (data.stream.rtmpIngestUrl) setServerUrl(data.stream.rtmpIngestUrl)
          if (data.stream.streamKey) setStreamKey(data.stream.streamKey)
          setStatus(data.stream.status || 'IDLE')

          if (data.stream.destinations) {
            const selectedIds = data.stream.destinations.map((d: any) => d.destinationId?.toString() || d.destinationId)
            setSelected(selectedIds)
          }
        }
      }

      if (videoRes.ok) {
        const vData = await videoRes.json()
        const videos: VideoItem[] = vData.videos || []
        setUserVideos(videos)
        if (preselectedVideoId) {
          setSourceType('PRERECORDED')
          const found = videos.find((v) => v.id === preselectedVideoId || v._id === preselectedVideoId)
          if (found) {
            setSelectedVideoId(found.id || found._id || preselectedVideoId)
            if (!title) setTitle(`Live: ${found.title}`)
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  useEffect(() => {
    loadInitialState()
  }, [preselectedVideoId])

  useEffect(() => {
    if (status === 'LIVE') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (status === 'IDLE') setElapsedSeconds(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  useEffect(() => {
    if (status === 'LIVE' || status === 'STARTING') {
      statusPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/live/status${streamId ? `?streamId=${streamId}` : ''}`)
          if (res.ok) {
            const data = await res.json()
            if (data.destinations && Array.isArray(data.destinations)) {
              const map: Record<string, { status: string; errorMessage?: string }> = {}
              data.destinations.forEach((d: any) => {
                map[d.destinationId] = { status: d.status, errorMessage: d.errorMessage }
              })
              setDestStatuses(map)
            }
          }
        } catch {}
      }, 5000)
    } else {
      if (statusPollRef.current) clearInterval(statusPollRef.current)
    }
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current)
    }
  }, [status, streamId])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const handleSelectVideo = (vid: string) => {
    setSelectedVideoId(vid)
    const found = userVideos.find((v) => v.id === vid || v._id === vid)
    if (found && (!title || title.startsWith('Live:'))) {
      setTitle(`Live: ${found.title}`)
    }
  }

  const handleStartStream = async () => {
    if (selected.length === 0) return
    if (sourceType === 'PRERECORDED' && !selectedVideoId) {
      setErrorMsg('Please select an uploaded video to stream.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setWorkerNotice(null)

    try {
      // 1. Create stream & configure destinations
      const createRes = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Live Stream',
          description,
          destinationIds: selected,
          sourceType,
          videoId: sourceType === 'PRERECORDED' ? selectedVideoId : undefined
        })
      })

      const createData = await createRes.json()
      if (!createRes.ok || createData.error) {
        throw new Error(createData.error || 'Failed to create live stream')
      }

      const newStreamId = createData.stream.id || createData.stream._id
      setStreamId(newStreamId)
      if (createData.stream.rtmpIngestUrl) setServerUrl(createData.stream.rtmpIngestUrl)
      if (createData.stream.streamKey) setStreamKey(createData.stream.streamKey)

      // 2. Start stream
      const startRes = await fetch('/api/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: newStreamId })
      })

      const startData = await startRes.json()
      if (!startRes.ok || startData.error) {
        throw new Error(startData.error || 'Failed to start stream')
      }

      if (startData.prerecordedNotice) {
        setWorkerNotice(startData.prerecordedNotice)
      }

      setStatus('LIVE')
    } catch (err: any) {
      setErrorMsg(err.message)
      setStatus('ERROR')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStopStream = async () => {
    if (!streamId) return
    setIsSubmitting(true)
    setErrorMsg(null)
    setWorkerNotice(null)

    try {
      const res = await fetch('/api/live/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to stop stream')
      }

      setStatus('ENDED')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return [hrs, mins, s].map((v) => String(v).padStart(2, '0')).join(':')
  }

  const selectedVideo = userVideos.find((v) => v.id === selectedVideoId || v._id === selectedVideoId)

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Live Studio</h1>
      <p className="mt-1 text-sm text-slate-500">Multistream live broadcasts from your encoder, webcam, or prerecorded video library.</p>

      {!isConfigured && (
        <Card className="mt-6 flex items-start gap-3 !border-amber-200 !bg-amber-50">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Streaming service not configured</p>
            <p className="mt-0.5 text-sm text-amber-700/80">
              Add <code className="rounded bg-white/60 px-1">STREAM_PROVIDER_API_KEY</code> to <code className="rounded bg-white/60 px-1">.env</code> to enable live streaming.
            </p>
          </div>
        </Card>
      )}

      {errorMsg && (
        <Card className="mt-4 flex items-center gap-3 !border-red-200 !bg-red-50 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0 text-red-600" />
          <p className="text-sm">{errorMsg}</p>
        </Card>
      )}

      {workerNotice && (
        <Card className="mt-4 flex items-start gap-3 !border-amber-200 !bg-amber-50 text-amber-800">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold">Serverless Environment Notice</p>
            <p className="mt-0.5 text-xs">{workerNotice}</p>
            <p className="mt-1 text-xs font-mono text-amber-900 bg-white/60 p-1.5 rounded">npm run worker</p>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Source Mode Toggle */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Stream Source</h2>
            <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
              <button
                onClick={() => setSourceType('ENCODER')}
                disabled={status === 'LIVE'}
                className={`focus-ring flex-1 rounded-lg py-2 text-center transition-colors ${sourceType === 'ENCODER' ? 'bg-white text-ink-800 shadow-card' : 'text-slate-500 hover:text-ink-800'}`}
              >
                Webcam / OBS / Encoder
              </button>
              <button
                onClick={() => setSourceType('PRERECORDED')}
                disabled={status === 'LIVE'}
                className={`focus-ring flex-1 rounded-lg py-2 text-center transition-colors ${sourceType === 'PRERECORDED' ? 'bg-white text-ink-800 shadow-card' : 'text-slate-500 hover:text-ink-800'}`}
              >
                Prerecorded Video
              </button>
            </div>
          </Card>

          {sourceType === 'PRERECORDED' ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink-800 flex items-center gap-2">
                  <Film size={16} className="text-teal-600" /> Select Video to Stream
                </h2>
              </div>
              {userVideos.length === 0 ? (
                <p className="text-sm text-slate-500">No uploaded videos found in library. Upload a video first to stream it live.</p>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedVideoId}
                    onChange={(e) => handleSelectVideo(e.target.value)}
                    disabled={status === 'LIVE'}
                    className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                  >
                    <option value="">-- Choose a video from your library --</option>
                    {userVideos.map((v) => (
                      <option key={v.id || v._id} value={v.id || v._id}>
                        {v.title}
                      </option>
                    ))}
                  </select>

                  {selectedVideo && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs text-slate-600">
                      <p className="font-semibold text-ink-800">{selectedVideo.title}</p>
                      <p className="mt-1 text-slate-400">Stream Source URL: <span className="truncate block font-mono text-[11px] text-teal-700">{selectedVideo.originalFileUrl}</span></p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="flex aspect-video items-center justify-center bg-ink-900">
                <div className="flex flex-col items-center gap-2 text-white/50">
                  <Camera size={32} />
                  <p className="text-sm">Camera / Encoder preview</p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <StatusPill status={status} label={status === 'LIVE' ? 'Live' : status === 'STARTING' ? 'Starting' : status === 'ENDED' ? 'Ended' : 'Idle'} />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
              {status === 'LIVE' ? (
                <Button variant="outline" onClick={handleStopStream} disabled={isSubmitting} className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                  <Radio size={15} /> Stop stream
                </Button>
              ) : (
                <Button
                  onClick={handleStartStream}
                  disabled={!isConfigured || selected.length === 0 || isSubmitting || (sourceType === 'PRERECORDED' && !selectedVideoId)}
                  className="gap-2"
                >
                  <Radio size={15} /> {isSubmitting ? 'Starting...' : 'Start stream'}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Destination status</h2>
            {selected.length === 0 ? (
              <p className="text-sm text-slate-500">Select destinations on the right to see their status here once you're live.</p>
            ) : (
              <div className="space-y-2">
                {selected.map((id) => {
                  const d = connectedDestinations.find((c) => c.id === id)
                  const info = destStatuses[id]
                  const dStatus = info?.status ? (info.status.toUpperCase() as any) : status === 'LIVE' ? 'LIVE' : 'IDLE'

                  return (
                    <div key={id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                      <PlatformChip platform={d?.platform || 'CUSTOM_RTMP'} />
                      <div className="flex items-center gap-2">
                        {info?.errorMessage && <span className="text-xs text-red-500">{info.errorMessage}</span>}
                        <StatusPill status={dStatus} label={dStatus === 'LIVE' ? 'Live' : dStatus === 'PENDING' ? 'Pending' : dStatus === 'ERROR' ? 'Error' : 'Not started'} />
                      </div>
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={status === 'LIVE'} placeholder="Stream title" className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={status === 'LIVE'} placeholder="Description (optional)" rows={3} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">Destinations</h2>
            {connectedDestinations.length === 0 ? (
              <p className="text-sm text-slate-500">No connected platforms support live streaming yet.</p>
            ) : (
              <div className="space-y-2">
                {connectedDestinations.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                    <PlatformChip platform={d.platform} />
                    <input type="checkbox" checked={selected.includes(d.id)} disabled={status === 'LIVE'} onChange={() => toggle(d.id)} className="h-4 w-4 accent-teal-600" />
                  </label>
                ))}
              </div>
            )}
          </Card>

          {sourceType === 'ENCODER' && (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-ink-800">Use OBS instead</h2>
              <p className="mb-3 text-xs text-slate-500">Point any encoder at this server and key.</p>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Server URL</label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                    <span className="truncate">{serverUrl}</span>
                    <button onClick={() => navigator.clipboard?.writeText(serverUrl)} className="ml-auto text-slate-400 hover:text-ink-800"><Copy size={13} /></button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Stream key</label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                    <span className="truncate">{showKey ? streamKey : '••••••••••••••••'}</span>
                    <button onClick={() => setShowKey((s) => !s)} className="ml-auto text-slate-400 hover:text-ink-800">
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(streamKey)} className="text-slate-400 hover:text-ink-800"><Copy size={13} /></button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
