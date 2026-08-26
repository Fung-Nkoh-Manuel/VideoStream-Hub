// Standalone persistent worker process for prerecorded video live streaming.
// Can be run on any server/VPS using: npx tsx scripts/prerecorded-worker.ts or npm run worker

import { connectToDatabase } from '../src/lib/mongodb'
import LiveStream, { ILiveStream } from '../src/lib/models/LiveStream'
import Video from '../src/lib/models/Video'
import { getStreamingProvider } from '../src/lib/streaming-provider'
import {
  startPrerecordedStream,
  isFfmpegAvailable,
  getActivePrerecordedStream,
  stopPrerecordedStream
} from '../src/lib/prerecorded-streamer'

async function runWorkerLoop() {
  console.log('[Worker] Starting VideoStream Hub Prerecorded Live Worker...')

  const ffmpegOk = await isFfmpegAvailable()
  if (!ffmpegOk) {
    console.error(
      '[Worker Error] FFmpeg executable not found in system PATH. Please install FFmpeg to use this worker.'
    )
    process.exit(1)
  }

  await connectToDatabase()
  console.log('[Worker] Connected to MongoDB database.')

  setInterval(async () => {
    try {
      // Find streams marked as STARTING or LIVE with sourceType PRERECORDED
      const streams = (await LiveStream.find({
        sourceType: 'PRERECORDED',
        status: { $in: ['STARTING', 'LIVE'] }
      })
        .select('+streamKey')
        .lean()) as unknown as ILiveStream[]

      for (const s of streams) {
        const streamId = String(s._id)
        const active = getActivePrerecordedStream(streamId)

        if (!active && s.videoUrl && s.rtmpIngestUrl && s.streamKey) {
          console.log(`[Worker] Starting stream for "${s.title}" (${streamId})...`)
          try {
            await startPrerecordedStream({
              streamId,
              videoUrl: s.videoUrl,
              rtmpIngestUrl: s.rtmpIngestUrl,
              streamKey: s.streamKey,
              onComplete: async () => {
                console.log(`[Worker] Video stream completed for "${s.title}" (${streamId}).`)
                await connectToDatabase()
                await LiveStream.updateOne({ _id: s._id }, { status: 'ENDED', endedAt: new Date() })
              }
            })
          } catch (err: any) {
            console.error(`[Worker Error] Failed to start stream ${streamId}:`, err.message)
            await LiveStream.updateOne({ _id: s._id }, { status: 'ERROR' })
          }
        }
      }
    } catch (err: any) {
      console.error('[Worker Loop Error]', err.message)
    }
  }, 5000)
}

runWorkerLoop().catch(console.error)
