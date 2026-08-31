import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import LiveStream from '@/lib/models/LiveStream'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.STREAM_PROVIDER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'STREAM_PROVIDER_API_KEY is not configured.' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const streamKey = searchParams.get('streamKey')
  const providerStreamId = searchParams.get('providerStreamId')

  if (!streamKey && !providerStreamId) {
    return NextResponse.json({ error: 'streamKey or providerStreamId parameter is required.' }, { status: 400 })
  }

  const sdpOffer = await req.text()
  if (!sdpOffer) {
    return NextResponse.json({ error: 'SDP offer body is required.' }, { status: 400 })
  }

  await connectToDatabase()

  // Safely construct MongoDB $or query
  const keyParam = streamKey || providerStreamId || ''
  const orConditions: any[] = [
    { streamKey: keyParam },
    { providerStreamId: keyParam }
  ]
  if (streamKey) orConditions.push({ streamKey })
  if (providerStreamId) orConditions.push({ providerStreamId })
  if (mongoose.Types.ObjectId.isValid(keyParam)) {
    orConditions.push({ _id: keyParam })
  }

  // Find stream in database to resolve both providerStreamId and streamKey
  const liveStreamDoc = await LiveStream.findOne({
    userId: session.user.id,
    $or: orConditions
  }).select('+streamKey')

  const candidateKeys = Array.from(
    new Set(
      [
        providerStreamId,
        streamKey,
        liveStreamDoc?.providerStreamId,
        liveStreamDoc?.streamKey
      ].filter(Boolean) as string[]
    )
  )

  const rawCustomUrl = process.env.STREAM_PROVIDER_API_URL
  const baseUrls: string[] = []
  if (rawCustomUrl && rawCustomUrl.trim() !== '') {
    baseUrls.push(rawCustomUrl.trim())
  }
  baseUrls.push(
    'https://livepeer.studio/api',
    'https://livepeer.com/api',
    'https://video.livepeer.studio/api',
    'https://ingest.livepeer.studio/api'
  )

  const attemptLogs: string[] = []

  for (const base of baseUrls) {
    const formattedBase = base.replace(/\/+$/, '')

    for (const key of candidateKeys) {
      const urlCandidates = [
        `${formattedBase}/stream/${encodeURIComponent(key)}/whip`,
        `${formattedBase}/whip/${encodeURIComponent(key)}`,
        `${formattedBase}/v1/whip/${encodeURIComponent(key)}`
      ]

      for (const whipTargetUrl of urlCandidates) {
        try {
          const res = await fetch(whipTargetUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/sdp'
            },
            body: sdpOffer,
            signal: AbortSignal.timeout(10000)
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
          attemptLogs.push(`[${res.status}] ${whipTargetUrl}: ${errTxt.slice(0, 100)}`)
        } catch (err: any) {
          attemptLogs.push(`[Err] ${whipTargetUrl}: ${err.message}`)
        }
      }
    }
  }

  const lastLog = attemptLogs[attemptLogs.length - 1] || 'Livepeer API WHIP endpoint unreachable'
  return NextResponse.json(
    { error: `WHIP proxy connection failed: ${lastLog}` },
    { status: 502 }
  )
}
