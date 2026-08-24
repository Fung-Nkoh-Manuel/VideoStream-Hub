import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const streamId = url.searchParams.get('streamId')

  await connectToDatabase()

  let liveStream = null
  if (streamId) {
    liveStream = await LiveStream.findOne({ _id: streamId, userId: session.user.id })
  } else {
    liveStream = await LiveStream.findOne({
      userId: session.user.id,
      status: { $in: ['IDLE', 'STARTING', 'LIVE', 'STOPPING'] }
    })
  }

  if (!liveStream) {
    return NextResponse.json({ status: 'IDLE', health: 'unknown', destinations: [] })
  }

  if (isStreamingConfigured() && liveStream.providerStreamId) {
    try {
      const providerStatus = await getStreamingProvider().getStatus(liveStream.providerStreamId)
      return NextResponse.json({
        streamId: liveStream._id.toString(),
        status: providerStatus.status,
        health: providerStatus.health,
        destinations: providerStatus.destinations
      })
    } catch {}
  }

  return NextResponse.json({
    streamId: liveStream._id.toString(),
    status: liveStream.status,
    health: 'unknown',
    destinations: liveStream.destinations
  })
}
