import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { Destination } from '@/lib/models/Destination'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isConfigured = isStreamingConfigured()
  await connectToDatabase()

  const destinations = await Destination.find({ userId: session.user.id, status: 'CONNECTED' }).lean()
  let stream = await LiveStream.findOne({
    userId: session.user.id,
    status: { $in: ['IDLE', 'STARTING', 'LIVE', 'STOPPING'] }
  })
    .select('+streamKey')
    .lean()

  if (stream && isConfigured && stream.providerStreamId) {
    try {
      const providerStatus = await getStreamingProvider().getStatus(stream.providerStreamId)
      ;(stream as any).providerStatus = providerStatus
    } catch {}
  }

  return NextResponse.json({ isConfigured, stream, destinations })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isStreamingConfigured()) {
    return NextResponse.json(
      { error: 'Streaming service is not configured. STREAM_PROVIDER_API_KEY is missing.' },
      { status: 400 }
    )
  }

  const { title, description, destinationIds } = (await req.json()) as {
    title: string
    description?: string
    destinationIds: string[]
  }

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  await connectToDatabase()

  const provider = getStreamingProvider()
  const created = await provider.createStream({ title })

  const validDestinations = await Destination.find({
    _id: { $in: destinationIds },
    userId: session.user.id
  }).lean()

  for (const dest of validDestinations) {
    try {
      await provider.addDestination(created.streamId, {
        id: dest._id.toString(),
        platform: dest.platform,
        rtmpUrl: (dest as any).rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2',
        streamKey: (dest as any).streamKey || ''
      })
    } catch {}
  }

  const stream = await LiveStream.create({
    userId: session.user.id,
    title,
    description,
    status: 'IDLE',
    streamKey: created.streamKey,
    rtmpIngestUrl: created.rtmpIngestUrl,
    providerStreamId: created.streamId,
    destinations: destinationIds.map((id) => ({ destinationId: id, status: 'PENDING' }))
  })

  return NextResponse.json({
    stream: {
      id: stream._id.toString(),
      title: stream.title,
      description: stream.description,
      status: stream.status,
      streamKey: created.streamKey,
      rtmpIngestUrl: created.rtmpIngestUrl,
      providerStreamId: created.streamId,
      destinations: stream.destinations
    }
  })
}
