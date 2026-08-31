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

  const destinationDetails = (liveStream.destinations || []).map((d: any) => ({
    destinationId: String(d.destinationId),
    status: d.status,
    platformPostUrl: d.platformPostUrl,
    errorMessage: d.errorMessage
  }))

  if (isStreamingConfigured() && liveStream.providerStreamId) {
    try {
      const providerStatus = await getStreamingProvider().getStatus(liveStream.providerStreamId)
      
      // Merge platformPostUrl from database
      const mergedDestinations = (providerStatus.destinations || []).map((pd: any) => {
        const matchingDoc = destinationDetails.find((d: any) => d.destinationId === pd.destinationId)
        return {
          ...pd,
          platformPostUrl: matchingDoc?.platformPostUrl || pd.platformPostUrl,
          errorMessage: matchingDoc?.errorMessage || pd.errorMessage
        }
      })

      return NextResponse.json({
        streamId: liveStream._id.toString(),
        status: providerStatus.status,
        health: providerStatus.health,
        destinations: mergedDestinations.length > 0 ? mergedDestinations : destinationDetails
      })
    } catch {}
  }

  return NextResponse.json({
    streamId: liveStream._id.toString(),
    status: liveStream.status,
    health: 'unknown',
    destinations: destinationDetails
  })
}
