import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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
  const keyParam = searchParams.get('streamKey') || searchParams.get('providerStreamId')
  if (!keyParam) {
    return NextResponse.json({ error: 'streamKey parameter is required.' }, { status: 400 })
  }

  const sdpOffer = await req.text()
  if (!sdpOffer) {
    return NextResponse.json({ error: 'SDP offer body is required.' }, { status: 400 })
  }

  await connectToDatabase()

  // Find stream in database to resolve both providerStreamId and streamKey
  const liveStreamDoc = await LiveStream.findOne({
    userId: session.user.id,
    $or: [{ streamKey: keyParam }, { providerStreamId: keyParam }, { _id: keyParam }]
  }).select('+streamKey')

  const candidateKeys = Array.from(
    new Set(
      [
        keyParam,
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
  baseUrls.push('https://livepeer.studio/api', 'https://livepeer.com/api')

  let lastErrText = ''

  for (const base of baseUrls) {
    const formattedBase = base.replace(/\/+$/, '')

    for (const key of candidateKeys) {
      const urlCandidates = [
        `${formattedBase}/stream/${encodeURIComponent(key)}/whip`,
        `${formattedBase}/whip/${encodeURIComponent(key)}`
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
          if (res.status !== 404) {
            lastErrText = errTxt
          }
        } catch (err: any) {
          lastErrText = err.message
        }
      }
    }
  }

  return NextResponse.json(
    { error: `WHIP proxy connection failed: ${lastErrText || 'Livepeer API WHIP endpoint not found or unreachable'}` },
    { status: 502 }
  )
}
