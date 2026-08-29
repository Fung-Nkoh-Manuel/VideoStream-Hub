import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.STREAM_PROVIDER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'STREAM_PROVIDER_API_KEY is not configured.' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const streamKey = searchParams.get('streamKey')
  if (!streamKey) {
    return NextResponse.json({ error: 'streamKey parameter is required.' }, { status: 400 })
  }

  const sdpOffer = await req.text()
  if (!sdpOffer) {
    return NextResponse.json({ error: 'SDP offer body is required.' }, { status: 400 })
  }

  const rawCustomUrl = process.env.STREAM_PROVIDER_API_URL
  const baseUrls: string[] = []
  if (rawCustomUrl && rawCustomUrl.trim() !== '') {
    baseUrls.push(rawCustomUrl.trim())
  }
  baseUrls.push('https://livepeer.studio/api', 'https://livepeer.com/api')

  let lastErrText = ''

  for (const base of baseUrls) {
    const formattedBase = base.replace(/\/+$/, '')
    const whipTargetUrl = `${formattedBase}/whip/${encodeURIComponent(streamKey)}`

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

      lastErrText = await res.text()
    } catch (err: any) {
      lastErrText = err.message
    }
  }

  return NextResponse.json(
    { error: `WHIP proxy connection failed: ${lastErrText || 'Livepeer API unreachable'}` },
    { status: 502 }
  )
}
