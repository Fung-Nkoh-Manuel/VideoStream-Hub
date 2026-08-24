'use client'

import { useCallback, useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Button, PlatformChip, ProgressBar } from '@/components/ui'
import { mockDestinations } from '@/lib/mock-data'
import { formatBytes } from '@/lib/utils'
import { UploadCloud, Sparkles, FileVideo, X, AlertTriangle } from 'lucide-react'

type Stage = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([])
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [generatingAI, setGeneratingAI] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadResultRef = useRef<{ publicId: string; secureUrl: string; durationSeconds?: number } | null>(null)

  const connectedDestinations = mockDestinations.filter((d) => d.status === 'CONNECTED')

  // Real direct-to-Cloudinary upload: fetch a signature from our server,
  // then upload the file straight to Cloudinary from the browser with
  // genuine XHR progress events. The video's bytes never pass through a
  // Vercel serverless function. Falls back to a clear error state (never
  // a fake progress bar) if Cloudinary isn't configured yet.
  const startUpload = useCallback(async (f: File) => {
    setFile(f)
    setTitle(f.name.replace(/\.[^/.]+$/, ''))
    setStage('uploading')
    setProgress(0)
    setErrorMsg(null)

    try {
      const signRes = await fetch('/api/upload/sign', { method: 'POST' })
      if (!signRes.ok) {
        const data = await signRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not start upload.')
      }
      const { timestamp, folder, signature, apiKey, cloudName, uploadUrl } = await signRes.json()

      const formData = new FormData()
      formData.append('file', f)
      formData.append('timestamp', String(timestamp))
      formData.append('folder', folder)
      formData.append('signature', signature)
      formData.append('api_key', apiKey)

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', uploadUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else reject(new Error('Upload to media storage failed.'))
        }
        xhr.onerror = () => reject(new Error('Upload to media storage failed.'))
        xhr.send(formData)
      })

      uploadResultRef.current = { publicId: result.public_id, secureUrl: result.secure_url, durationSeconds: result.duration }
      setStage('processing')

      // Register the video record now that the file lives in Cloudinary.
      const createRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.name.replace(/\.[^/.]+$/, ''),
          cloudinaryPublicId: result.public_id,
          originalFileUrl: result.secure_url,
          originalFileName: f.name,
          fileSizeBytes: f.size,
          durationSeconds: result.duration,
          thumbnailUrl: result.thumbnail_url
        })
      })
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not save video record.')
      }
      setStage('ready')
    } catch (err: any) {
      setStage('failed')
      setErrorMsg(err.message ?? 'Something went wrong during upload.')
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) startUpload(f)
  }

  function toggleDestination(id: string) {
    setSelectedDestinations((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  function reset() {
    setFile(null)
    setStage('idle')
    setProgress(0)
    setTitle('')
    setDescription('')
    setTags('')
    setSelectedDestinations([])
    setErrorMsg(null)
  }

  async function generateWithAI() {
    setGeneratingAI(true)
    try {
      const res = await fetch('/api/ai/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file?.name })
      })
      if (res.ok) {
        const data = await res.json()
        setTitle(data.title ?? title)
        setDescription(data.description ?? description)
        setTags((data.tags ?? []).join(', '))
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'AI suggestions are not available right now.')
      }
    } finally {
      setGeneratingAI(false)
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-ink-800">Upload video</h1>
      <p className="mt-1 text-sm text-slate-500">MP4, MOV, and WebM from phones, cameras, and editors like CapCut are all supported.</p>

      {!file ? (
        <Card
          className={`mt-6 flex flex-col items-center justify-center border-2 border-dashed !bg-slate-50/50 py-20 text-center transition-colors ${dragOver ? 'border-teal-500 bg-teal-50/40' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
            <UploadCloud size={26} />
          </div>
          <p className="text-base font-semibold text-ink-800">Drag and drop a video</p>
          <p className="mt-1 text-sm text-slate-500">or</p>
          <Button className="mt-3" onClick={() => inputRef.current?.click()}>Choose a file</Button>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])} />
          <p className="mt-4 text-xs text-slate-400">Large files are supported via direct upload to media storage.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-ink-800 text-white"><FileVideo size={20} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
                <button onClick={reset} className="focus-ring rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Remove file"><X size={16} /></button>
              </div>
              <div className="mt-4">
                {stage === 'uploading' && (
                  <>
                    <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500"><span>Uploading…</span><span>{progress}%</span></div>
                    <ProgressBar value={progress} max={100} tone="teal" />
                  </>
                )}
                {stage === 'processing' && (
                  <>
                    <div className="mb-1.5 flex justify-between text-xs font-medium text-amber-600"><span>Processing — generating thumbnails and playback versions…</span></div>
                    <ProgressBar value={70} max={100} tone="amber" />
                  </>
                )}
                {stage === 'ready' && <p className="text-sm font-medium text-ok">Ready — fill in details and publish below.</p>}
                {stage === 'failed' && (
                  <div className="flex items-start gap-2 rounded-xl bg-live/5 p-3 text-sm text-live">
                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{errorMsg ?? 'Upload failed. Please try again.'}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className={stage !== 'ready' ? 'pointer-events-none opacity-50' : ''}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-800">Details</h2>
                <button onClick={generateWithAI} disabled={generatingAI} className="focus-ring flex items-center gap-1.5 rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-500/20 disabled:opacity-50">
                  <Sparkles size={13} /> {generatingAI ? 'Generating…' : 'Generate with AI'}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Tags (comma separated)</label>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sermon, worship, community" className="focus-ring w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" />
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={stage !== 'ready' ? 'pointer-events-none opacity-50' : ''}>
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Destinations</h2>
              {connectedDestinations.length === 0 ? (
                <p className="text-sm text-slate-500">No platforms connected yet. <a href="/destinations" className="font-medium text-teal-600 hover:underline">Connect one</a> to publish.</p>
              ) : (
                <div className="space-y-2">
                  {connectedDestinations.map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                      <span className="flex items-center gap-2"><PlatformChip platform={d.platform} /></span>
                      <input type="checkbox" checked={selectedDestinations.includes(d.id)} onChange={() => toggleDestination(d.id)} className="h-4 w-4 accent-teal-600" />
                    </label>
                  ))}
                </div>
              )}
            </Card>

            <Card className={stage !== 'ready' ? 'pointer-events-none opacity-50' : ''}>
              <h2 className="mb-3 text-sm font-semibold text-ink-800">When</h2>
              <div className="mb-3 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
                <button onClick={() => setMode('now')} className={`focus-ring flex-1 rounded-lg py-2 ${mode === 'now' ? 'bg-white text-ink-800 shadow-card' : 'text-slate-500'}`}>Publish now</button>
                <button onClick={() => setMode('schedule')} className={`focus-ring flex-1 rounded-lg py-2 ${mode === 'schedule' ? 'bg-white text-ink-800 shadow-card' : 'text-slate-500'}`}>Schedule</button>
              </div>
              {mode === 'schedule' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input type="time" className="focus-ring rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              )}
              <Button className="mt-4 w-full" disabled={stage !== 'ready' || selectedDestinations.length === 0}>
                {mode === 'now' ? 'Publish' : 'Schedule'}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  )
}
