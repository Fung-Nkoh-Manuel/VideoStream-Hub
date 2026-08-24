import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { Destination } from '@/lib/models/Destination'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'
import { YouTubeConnector } from '@/lib/platform-connectors'

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

  const { title, description, destinationIds = [] } = (await req.json()) as {
    title: string
    description?: string
    destinationIds: string[]
  }

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  await connectToDatabase()

  try {
    const provider = getStreamingProvider()
    const created = await provider.createStream({ title })

    const validDestinations = await Destination.find({
      _id: { $in: destinationIds },
      userId: session.user.id
    }).select('+accessToken +refreshToken')

    const destinationRecords: Array<{
      destinationId: any
      status: 'PENDING' | 'LIVE' | 'STOPPED' | 'ERROR'
      platformBroadcastId?: string
      platformPostUrl?: string
      rtmpUrl?: string
      errorMessage?: string
    }> = []

    const ytConnector = new YouTubeConnector()

    for (const dest of validDestinations) {
      if (dest.platform === 'YOUTUBE') {
        try {
          let accessToken = dest.accessToken
          if (!accessToken && dest.refreshToken) {
            const tokens = await ytConnector.refreshAccessToken(dest.refreshToken)
            accessToken = tokens.accessToken
            dest.accessToken = tokens.accessToken
            dest.tokenExpiresAt = tokens.expiresAt
            await dest.save()
          }

          if (!accessToken) {
            throw new Error('YouTube access token missing. Please reconnect YouTube.')
          }

          // 1. Create real YouTube Live Broadcast & Stream
          const ytLive = await ytConnector.createLiveBroadcast(accessToken, title, description)

          // 2. Add YouTube RTMP Target to Livepeer Multistreaming
          await provider.addDestination(created.streamId, {
            id: dest._id.toString(),
            platform: 'YOUTUBE',
            rtmpUrl: ytLive.rtmpUrl,
            streamKey: ytLive.streamKey
          })

          destinationRecords.push({
            destinationId: dest._id,
            status: 'PENDING',
            platformBroadcastId: ytLive.broadcastId,
            platformPostUrl: ytLive.platformPostUrl,
            rtmpUrl: ytLive.rtmpUrl
          })
        } catch (destErr: any) {
          destinationRecords.push({
            destinationId: dest._id,
            status: 'ERROR',
            errorMessage: destErr.message || 'YouTube live setup failed'
          })
        }
      } else {
        // Fallback for custom RTMP or non-YouTube destinations
        try {
          await provider.addDestination(created.streamId, {
            id: dest._id.toString(),
            platform: dest.platform,
            rtmpUrl: (dest as any).rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2',
            streamKey: (dest as any).streamKey || ''
          })
          destinationRecords.push({
            destinationId: dest._id,
            status: 'PENDING'
          })
        } catch (err: any) {
          destinationRecords.push({
            destinationId: dest._id,
            status: 'ERROR',
            errorMessage: err.message
          })
        }
      }
    }

    const stream = await LiveStream.create({
      userId: session.user.id,
      title,
      description,
      status: 'IDLE',
      streamKey: created.streamKey,
      rtmpIngestUrl: created.rtmpIngestUrl,
      providerStreamId: created.streamId,
      destinations: destinationRecords
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create live stream with streaming provider.' },
      { status: 502 }
    )
  }
}
