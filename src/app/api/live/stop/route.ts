import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { Destination } from '@/lib/models/Destination'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'
import { YouTubeConnector } from '@/lib/platform-connectors'
import { stopPrerecordedStream } from '@/lib/prerecorded-streamer'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { streamId } = (await req.json()) as { streamId: string }
  if (!streamId) return NextResponse.json({ error: 'streamId is required' }, { status: 400 })

  await connectToDatabase()
  const liveStream = await LiveStream.findOne({ _id: streamId, userId: session.user.id })
  if (!liveStream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

  // Stop active FFmpeg prerecorded stream if running
  stopPrerecordedStream(streamId)

  if (isStreamingConfigured() && liveStream.providerStreamId) {
    try {
      await getStreamingProvider().stopStream(liveStream.providerStreamId)
    } catch {}
  }

  // Transition any linked YouTube Live Broadcasts to complete
  const ytConnector = new YouTubeConnector()
  for (const d of liveStream.destinations) {
    if (d.platformBroadcastId) {
      try {
        const destDoc = await Destination.findOne({ _id: d.destinationId, userId: session.user.id }).select('+accessToken +refreshToken')
        if (destDoc?.accessToken) {
          await ytConnector.transitionLiveBroadcast(destDoc.accessToken, d.platformBroadcastId, 'complete')
          d.status = 'STOPPED'
        }
      } catch {}
    } else {
      d.status = 'STOPPED'
    }
  }

  liveStream.status = 'ENDED'
  liveStream.endedAt = new Date()
  await liveStream.save()

  return NextResponse.json({ success: true, status: liveStream.status, endedAt: liveStream.endedAt })
}
