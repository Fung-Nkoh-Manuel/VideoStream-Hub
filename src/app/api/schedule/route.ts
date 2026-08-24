import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import ScheduledItem, { IScheduledItem } from '@/lib/models/ScheduledItem'
import { Destination, IDestination } from '@/lib/models/Destination'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const rawItems = (await ScheduledItem.find({ userId: session.user.id })
    .sort({ scheduledAt: 1 })
    .lean()) as unknown as IScheduledItem[]

  const destIds = Array.from(new Set(rawItems.flatMap((i) => i.destinationIds || [])))
  const destinations = (await Destination.find({ _id: { $in: destIds } }).lean()) as unknown as IDestination[]

  const items = rawItems.map((item) => {
    const itemDests = destinations.filter((d) =>
      item.destinationIds?.some((id: any) => String(id) === String(d._id))
    )
    const platforms = Array.from(new Set(itemDests.map((d) => d.platform)))

    return {
      id: String(item._id),
      title: item.title,
      type: item.type,
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString() : new Date().toISOString(),
      platforms: platforms.length > 0 ? platforms : ['YOUTUBE'],
      status: item.status
    }
  })

  return NextResponse.json({ schedule: items })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, type, scheduledAt, destinationIds } = (await req.json()) as {
    title: string
    type: 'VIDEO_PUBLISH' | 'LIVE_STREAM' | 'PRERECORDED_LIVE'
    scheduledAt: string
    destinationIds?: string[]
  }

  if (!title || !scheduledAt) {
    return NextResponse.json({ error: 'Title and scheduledAt are required.' }, { status: 400 })
  }

  await connectToDatabase()

  const item = await ScheduledItem.create({
    userId: session.user.id,
    title,
    type: type || 'VIDEO_PUBLISH',
    scheduledAt: new Date(scheduledAt),
    destinationIds: destinationIds || [],
    status: 'SCHEDULED'
  })

  return NextResponse.json({ item })
}
