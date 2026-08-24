import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Optional "Generate with AI" feature. Requires ANTHROPIC_API_KEY. The
// user always sees and can edit these suggestions before anything is
// published — nothing here is applied automatically.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI metadata generation is not configured. Add ANTHROPIC_API_KEY to .env.' }, { status: 503 })
  }

  const { fileName } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You write concise, engaging video metadata. Respond with ONLY valid JSON: {"title": string, "description": string, "tags": string[]}. No preamble, no markdown fences.',
      messages: [{ role: 'user', content: `Suggest a title, description, and 5 tags for a video with filename "${fileName ?? 'video'}".` }]
    })
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'AI suggestion service returned an error.' }, { status: 502 })
  }

  const data = await res.json()
  const text = data.content?.find((c: any) => c.type === 'text')?.text ?? '{}'
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse AI suggestions.' }, { status: 502 })
  }
}
