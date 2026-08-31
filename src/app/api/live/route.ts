import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream, { ILiveStream } from '@/lib/models/LiveStream'
import Video from '@/lib/models/Video'
import { Destination, IDestination } from '@/lib/models/Destination'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'
import { YouTubeConnector } from '@/lib/platform-connectors'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isConfigured = isStreamingConfigured()
  await connectToDatabase()

  const destinations = (await Destination.find({ userId: session.user.id, status: 'CONNECTED' }).lean()) as unknown as IDestination[]
  let stream = (await LiveStream.findOne({
    userId: session.user.id,
    status: { $in: ['IDLE', 'STARTING', 'LIVE', 'STOPPING'] }
  })
    .select('+streamKey')
    .lean()) as unknown as ILiveStream | null

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

  const { title, description, destinationIds = [], sourceType = 'ENCODER', videoId } = (await req.json()) as {
    title: string
    description?: string
    destinationIds: string[]
    sourceType?: 'ENCODER' | 'PRERECORDED'
    videoId?: string
  }

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  await connectToDatabase()

  let videoUrl: string | undefined
  if (sourceType === 'PRERECORDED') {
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required for prerecorded video live streams.' }, { status: 400 })
    }
    const videoDoc = await Video.findOne({ _id: videoId, userId: session.user.id })
    if (!videoDoc) {
      return NextResponse.json({ error: 'Selected video was not found or access denied.' }, { status: 404 })
    }
    videoUrl = videoDoc.originalFileUrl
  }

  try {
    const provider = getStreamingProvider()
    const created = await provider.createStream({ title })

    const validDestinations = (await Destination.find({
      _id: { $in: destinationIds },
      userId: session.user.id
    }).select('+accessToken +refreshToken')) as unknown as IDestination[]

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
          if (dest.refreshToken) {
            try {
              const tokens = await ytConnector.refreshAccessToken(dest.refreshToken)
              accessToken = tokens.accessToken
              await Destination.updateOne(
                { _id: dest._id },
                { accessToken: tokens.accessToken, tokenExpiresAt: tokens.expiresAt }
              )
            } catch (refErr: any) {
              console.warn('YouTube token refresh warning:', refErr.message)
            }
          }

          if (!accessToken) {
            throw new Error('YouTube access token missing or expired. Please reconnect YouTube in Destinations.')
          }

          // 1. Create real YouTube Live Broadcast & Stream
          const ytLive = await ytConnector.createLiveBroadcast(accessToken, title, description)

          // 2. Add YouTube RTMP Target to Livepeer Multistreaming
          await provider.addDestination(created.streamId, {
            id: String(dest._id),
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
          let errMsg = destErr.message || 'YouTube live setup failed'
          if (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('scope')) {
            errMsg = 'YouTube live permissions missing. Go to Destinations page and click Reconnect on YouTube to grant live streaming access.'
          }
          destinationRecords.push({
            destinationId: dest._id,
            status: 'ERROR',
            errorMessage: errMsg
          })
        }
      } else {
        // Fallback for custom RTMP or non-YouTube destinations
        try {
          await provider.addDestination(created.streamId, {
            id: String(dest._id),
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
      sourceType,
      videoId,
      videoUrl,
      streamKey: created.streamKey,
      rtmpIngestUrl: created.rtmpIngestUrl,
      whipIngestUrl: created.whipIngestUrl,
      providerStreamId: created.streamId,
      destinations: destinationRecords
    })

    return NextResponse.json({
      stream: {
        id: String(stream._id),
        title: stream.title,
        description: stream.description,
        status: stream.status,
        sourceType: stream.sourceType,
        videoId: stream.videoId ? String(stream.videoId) : undefined,
        videoUrl: stream.videoUrl,
        streamKey: created.streamKey,
        rtmpIngestUrl: created.rtmpIngestUrl,
        whipIngestUrl: created.whipIngestUrl,
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
