import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { streamId } = (await req.json()) as { streamId: string }
  if (!streamId) return NextResponse.json({ error: 'streamId is required' }, { status: 400 })

  await connectToDatabase()
  const liveStream = await LiveStream.findOne({ _id: streamId, userId: session.user.id })
  if (!liveStream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

  if (isStreamingConfigured() && liveStream.providerStreamId) {
    try {
      await getStreamingProvider().startStream(liveStream.providerStreamId)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to start stream' }, { status: 500 })
    }
  }

  liveStream.status = 'LIVE'
  liveStream.startedAt = new Date()
  await liveStream.save()

  return NextResponse.json({ success: true, status: liveStream.status, startedAt: liveStream.startedAt })
}
