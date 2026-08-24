import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Destination } from '@/lib/models/Destination'
import { isPlatformConfigured, PlatformKey } from '@/lib/platform-connectors'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()
  // accessToken/refreshToken have `select: false` on the schema, so they
  // are never included here even implicitly — the client never sees them.
  const destinations = await Destination.find({ userId: session.user.id }).lean()
  return NextResponse.json({ destinations })
}

// POST /api/destinations — starts a connection. If the platform has no API
// credentials configured yet, the destination is created in
// SETUP_REQUIRED state rather than silently pretending to connect (see
// platform-connectors.ts / .env.example for the required variables).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = (await req.json()) as { platform: PlatformKey }
  if (!platform) return NextResponse.json({ error: 'platform is required.' }, { status: 400 })

  await connectToDatabase()
  const configured = isPlatformConfigured(platform)

  const destination = await Destination.create({
    userId: session.user.id,
    platform,
    accountName: '',
    status: configured ? 'CONNECTING' : 'SETUP_REQUIRED'
  })

  // When configured, the client should redirect to
  // /api/destinations/[platform]/authorize to begin the real OAuth flow.
  return NextResponse.json({ destination, nextStep: configured ? `/api/destinations/${platform.toLowerCase()}/authorize` : null })
}
