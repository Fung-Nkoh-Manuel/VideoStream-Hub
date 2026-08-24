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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { platform } = (await req.json()) as { platform: PlatformKey }
  if (!platform) return NextResponse.json({ error: 'platform is required.' }, { status: 400 })

  await connectToDatabase()
  const configured = isPlatformConfigured(platform)

  let destination = await Destination.findOne({ userId: session.user.id, platform })
  if (!destination) {
    destination = await Destination.create({
      userId: session.user.id,
      platform,
      accountName: '',
      status: configured ? 'CONNECTING' : 'SETUP_REQUIRED'
    })
  } else {
    destination.status = configured ? 'CONNECTING' : 'SETUP_REQUIRED'
    await destination.save()
  }

  return NextResponse.json({ destination, nextStep: configured ? `/api/destinations/${platform.toLowerCase()}/authorize` : null })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const platform = searchParams.get('platform')

  await connectToDatabase()

  if (id) {
    await Destination.deleteOne({ _id: id, userId: session.user.id })
  } else if (platform) {
    await Destination.deleteOne({ platform: platform.toUpperCase(), userId: session.user.id })
  } else {
    return NextResponse.json({ error: 'Destination ID or platform required' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
