import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const streamKeyParam = searchParams.get('streamKey') || searchParams.get('providerStreamId')
  if (!streamKeyParam) {
    return NextResponse.json({ error: 'streamKey parameter is required.' }, { status: 400 })
  }

  const sdpOffer = await req.text()
  if (!sdpOffer) {
    return NextResponse.json({ error: 'SDP offer body is required.' }, { status: 400 })
  }

  await connectToDatabase()

  // Safely query MongoDB to resolve streamKey
  const orConditions: any[] = [
    { streamKey: streamKeyParam },
    { providerStreamId: streamKeyParam }
  ]
  if (mongoose.Types.ObjectId.isValid(streamKeyParam)) {
    orConditions.push({ _id: streamKeyParam })
  }

  const liveStreamDoc = await LiveStream.findOne({
    userId: session.user.id,
    $or: orConditions
  }).select('+streamKey')

  const effectiveStreamKey = liveStreamDoc?.streamKey || streamKeyParam
  const apiKey = process.env.STREAM_PROVIDER_API_KEY

  // Livepeer Official WebRTC WHIP Endpoints: https://livepeer.studio/webrtc/{STREAM_KEY}
  const candidateUrls = Array.from(
    new Set([
      `https://livepeer.studio/webrtc/${encodeURIComponent(effectiveStreamKey)}`,
      `https://livepeer.com/webrtc/${encodeURIComponent(effectiveStreamKey)}`,
      `https://ingest.livepeer.studio/webrtc/${encodeURIComponent(effectiveStreamKey)}`
    ])
  )

  let lastErrText = ''

  for (const whipTargetUrl of candidateUrls) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/sdp'
      }
      if (apiKey && apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`
      }

      // Livepeer WHIP endpoint uses 307 redirects to regional catalyst servers. Node fetch must follow redirects.
      const res = await fetch(whipTargetUrl, {
        method: 'POST',
        headers,
        body: sdpOffer,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000)
      })

      if (res.ok || res.status === 201) {
        const answerSdp = await res.text()
        return new Response(answerSdp, {
          status: 200,
          headers: {
            'Content-Type': 'application/sdp'
          }
        })
      }

      const errTxt = await res.text()
      lastErrText = `[${res.status}] ${whipTargetUrl}: ${errTxt || res.statusText}`
    } catch (err: any) {
      lastErrText = `[Err] ${whipTargetUrl}: ${err.message}`
    }
  }

  return NextResponse.json(
    { error: `Livepeer WHIP WebRTC connection failed: ${lastErrText}` },
    { status: 502 }
  )
}
