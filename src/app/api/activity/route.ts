import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ActivityLog, IActivityLog } from '@/lib/models/Activity'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const activities = (await ActivityLog.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()) as unknown as IActivityLog[]

  const formatted = activities.map((a) => ({
    id: String(a._id),
    type: a.type,
    status: a.status,
    message: a.message,
    platform: a.platform,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString()
  }))

  return NextResponse.json({ activities: formatted })
}
