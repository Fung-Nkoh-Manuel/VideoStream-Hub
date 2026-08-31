import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'
import { startPrerecordedStream } from '@/lib/prerecorded-streamer'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { streamId } = (await req.json()) as { streamId: string }
  if (!streamId) return NextResponse.json({ error: 'streamId is required' }, { status: 400 })

  await connectToDatabase()
  const liveStream = await LiveStream.findOne({ _id: streamId, userId: session.user.id }).select('+streamKey')
  if (!liveStream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

  if (isStreamingConfigured() && liveStream.providerStreamId) {
    try {
      await getStreamingProvider().startStream(liveStream.providerStreamId)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to start stream' }, { status: 500 })
    }
  }

  // If this is a prerecorded stream, start FFmpeg streaming process
  let prerecordedNotice: string | undefined
  if (liveStream.sourceType === 'PRERECORDED' && liveStream.videoUrl && liveStream.rtmpIngestUrl && liveStream.streamKey) {
    try {
      await startPrerecordedStream({
        streamId: String(liveStream._id),
        videoUrl: liveStream.videoUrl,
        rtmpIngestUrl: liveStream.rtmpIngestUrl,
        streamKey: liveStream.streamKey,
        onComplete: async () => {
          await connectToDatabase()
          await LiveStream.updateOne({ _id: liveStream._id }, { status: 'ENDED', endedAt: new Date() })
        }
      })
    } catch (ffmpegErr: any) {
      prerecordedNotice = ffmpegErr.message
    }
  }

  // NOTE: YouTube broadcast transition to 'live' is deliberately NOT done here.
  // YouTube requires video frames to already be arriving at its RTMP endpoint before
  // accepting the 'live' transition. The client calls /api/live/activate ~8 seconds
  // after the WebRTC/WHIP connection succeeds, once frames are flowing.

  liveStream.status = 'LIVE'
  liveStream.startedAt = new Date()
  await liveStream.save()

  return NextResponse.json({
    success: true,
    status: liveStream.status,
    startedAt: liveStream.startedAt,
    prerecordedNotice
  })
}
