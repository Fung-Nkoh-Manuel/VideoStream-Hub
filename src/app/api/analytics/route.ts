import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import AnalyticsSnapshot from '@/lib/models/Analytics'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const snapshots = await AnalyticsSnapshot.find({ userId: session.user.id })
    .sort({ capturedAt: -1 })
    .lean()

  // Aggregate totals across all platforms
  const totals = snapshots.reduce(
    (acc, s) => ({
      views: acc.views + (s.views || 0),
      likes: acc.likes + (s.likes || 0),
      comments: acc.comments + (s.comments || 0),
      shares: acc.shares + (s.shares || 0),
      watchTimeHours: acc.watchTimeHours + Math.round((s.watchTimeMinutes || 0) / 60)
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, watchTimeHours: 0 }
  )

  // Per-platform aggregates (most recent snapshot per platform)
  const platformMap = new Map<string, any>()
  for (const s of snapshots) {
    if (!platformMap.has(s.platform)) {
      platformMap.set(s.platform, {
        platform: s.platform,
        views: s.views || 0,
        likes: s.likes || 0,
        comments: s.comments || 0,
        followers: s.newFollowers || 0
      })
    }
  }
  const byPlatform = Array.from(platformMap.values())

  // Views over time — group by date
  const byDate = new Map<string, Record<string, number>>()
  for (const s of snapshots) {
    const date = s.capturedAt ? new Date(s.capturedAt).toISOString().split('T')[0] : ''
    if (!date) continue
    if (!byDate.has(date)) byDate.set(date, {})
    const entry = byDate.get(date)!
    entry[s.platform] = (entry[s.platform] || 0) + (s.views || 0)
  }
  const viewsOverTime = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platforms]) => ({ date, ...platforms }))

  return NextResponse.json({ totals, byPlatform, viewsOverTime, hasData: snapshots.length > 0 })
}
