import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'
import { Destination } from '@/lib/models/Destination'
import { YouTubeConnector } from '@/lib/platform-connectors'

/**
 * POST /api/live/activate
 *
 * Transitions YouTube Live Broadcasts from "upcoming" → "live".
 * Must be called AFTER the WebRTC/WHIP connection is established and
 * video frames have had time to start flowing through Livepeer to YouTube's
 * RTMP ingest endpoint (~8 seconds after WHIP connects).
 *
 * YouTube rejects the 'live' transition if no frames have arrived yet.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { streamId } = (await req.json()) as { streamId: string }
  if (!streamId) return NextResponse.json({ error: 'streamId is required' }, { status: 400 })

  await connectToDatabase()
  const liveStream = await LiveStream.findOne({ _id: streamId, userId: session.user.id })
  if (!liveStream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

  const ytConnector = new YouTubeConnector()
  const results: Array<{ destinationId: string; status: string; error?: string }> = []

  for (const d of liveStream.destinations) {
    if (!d.platformBroadcastId) continue

    try {
      const destDoc = await Destination.findOne({
        _id: d.destinationId,
        userId: session.user.id
      }).select('+accessToken +refreshToken')

      if (!destDoc) continue

      let accessToken = destDoc.accessToken

      // Always try to refresh token first
      if (destDoc.refreshToken) {
        try {
          const tokens = await ytConnector.refreshAccessToken(destDoc.refreshToken)
          accessToken = tokens.accessToken
        } catch {}
      }

      if (!accessToken) {
        results.push({ destinationId: String(d.destinationId), status: 'ERROR', error: 'No access token available' })
        continue
      }

      await ytConnector.transitionLiveBroadcast(accessToken, d.platformBroadcastId, 'live')
      d.status = 'LIVE'
      results.push({ destinationId: String(d.destinationId), status: 'LIVE' })
    } catch (err: any) {
      const errMsg = err.message || 'Transition failed'
      results.push({ destinationId: String(d.destinationId), status: 'ERROR', error: errMsg })
      d.errorMessage = errMsg
    }
  }

  await liveStream.save()

  return NextResponse.json({ success: true, results })
}
