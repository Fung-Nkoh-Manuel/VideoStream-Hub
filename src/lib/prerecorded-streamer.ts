import { spawn, ChildProcess } from 'child_process'

export interface ActivePrerecordedStream {
  streamId: string
  videoUrl: string
  rtmpIngestUrl: string
  streamKey: string
  startedAt: Date
  process?: ChildProcess
  status: 'STARTING' | 'STREAMING' | 'ENDED' | 'ERROR'
  errorMessage?: string
}

const activeStreams = new Map<string, ActivePrerecordedStream>()

export function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('ffmpeg', ['-version'])
      proc.on('error', () => resolve(false))
      proc.on('close', (code) => resolve(code === 0))
    } catch {
      resolve(false)
    }
  })
}

export async function startPrerecordedStream(input: {
  streamId: string
  videoUrl: string
  rtmpIngestUrl: string
  streamKey: string
  onComplete?: () => Promise<void>
}): Promise<ActivePrerecordedStream> {
  const { streamId, videoUrl, rtmpIngestUrl, streamKey, onComplete } = input

  // If a stream with this ID is already running, stop it first
  if (activeStreams.has(streamId)) {
    stopPrerecordedStream(streamId)
  }

  const fullDestinationUrl = rtmpIngestUrl.endsWith('/')
    ? `${rtmpIngestUrl}${streamKey}`
    : `${rtmpIngestUrl}/${streamKey}`

  // Check if FFmpeg is executable
  const ffmpegInstalled = await isFfmpegAvailable()
  if (!ffmpegInstalled) {
    const streamItem: ActivePrerecordedStream = {
      streamId,
      videoUrl,
      rtmpIngestUrl,
      streamKey,
      startedAt: new Date(),
      status: 'ERROR',
      errorMessage:
        'FFmpeg executable is not found on system PATH. Install FFmpeg on your server or run the background worker (npm run worker) to stream prerecorded videos.'
    }
    activeStreams.set(streamId, streamItem)
    throw new Error(streamItem.errorMessage)
  }

  // FFmpeg arguments for streaming an input HTTP/Cloudinary MP4 file over RTMP
  const ffmpegArgs = [
    '-re', // Read input at native frame rate
    '-i',
    videoUrl,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-maxrate',
    '3000k',
    '-bufsize',
    '6000k',
    '-pix_fmt',
    'yuv420p',
    '-g',
    '50',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-f',
    'flv',
    fullDestinationUrl
  ]

  const proc = spawn('ffmpeg', ffmpegArgs)

  const streamItem: ActivePrerecordedStream = {
    streamId,
    videoUrl,
    rtmpIngestUrl,
    streamKey,
    startedAt: new Date(),
    process: proc,
    status: 'STREAMING'
  }

  proc.stderr?.on('data', (data) => {
    const log = data.toString()
    // Ignore benign FFmpeg statistics output
    if (log.includes('error') && !log.includes('frame=')) {
      console.warn(`[FFmpeg ${streamId}] ${log}`)
    }
  })

  proc.on('error', (err) => {
    console.error(`[FFmpeg error ${streamId}]`, err)
    streamItem.status = 'ERROR'
    streamItem.errorMessage = err.message
  })

  proc.on('close', async (code) => {
    console.log(`[FFmpeg ${streamId}] process exited with code ${code}`)
    if (streamItem.status !== 'ERROR') {
      streamItem.status = 'ENDED'
    }
    activeStreams.delete(streamId)
    if (onComplete) {
      try {
        await onComplete()
      } catch {}
    }
  })

  activeStreams.set(streamId, streamItem)
  return streamItem
}

export function stopPrerecordedStream(streamId: string): boolean {
  const item = activeStreams.get(streamId)
  if (!item) return false

  if (item.process && !item.process.killed) {
    try {
      item.process.kill('SIGTERM')
    } catch {
      try {
        item.process.kill('SIGKILL')
      } catch {}
    }
  }

  item.status = 'ENDED'
  activeStreams.delete(streamId)
  return true
}

export function getActivePrerecordedStream(streamId: string): ActivePrerecordedStream | undefined {
  return activeStreams.get(streamId)
}

export function getAllActivePrerecordedStreams(): ActivePrerecordedStream[] {
  return Array.from(activeStreams.values())
}
