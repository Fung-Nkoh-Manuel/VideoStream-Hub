import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Video from '@/lib/models/Video'
import User from '@/lib/models/User'
import { Destination } from '@/lib/models/Destination'
import ScheduledItem from '@/lib/models/ScheduledItem'
import { ActivityLog } from '@/lib/models/Activity'
import LiveStream from '@/lib/models/LiveStream'
import PublishJob from '@/lib/models/PublishJob'
import { PLATFORM_CONFIG } from '@/lib/platform-connectors'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const userId = session.user.id

  const [
    user,
    allDestinations,
    totalVideos,
    upcomingScheduledCount,
    activeLiveStream,
    recentVideosRaw,
    recentActivityRaw,
    upcomingRaw
  ] = await Promise.all([
    User.findById(userId).lean(),
    Destination.find({ userId }).lean(),
    Video.countDocuments({ userId }),
    ScheduledItem.countDocuments({ userId, status: 'SCHEDULED' }),
    LiveStream.findOne({ userId, status: 'LIVE' }).lean(),
    Video.find({ userId }).sort({ createdAt: -1 }).limit(4).lean(),
    ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ScheduledItem.find({ userId, status: 'SCHEDULED' }).sort({ scheduledAt: 1 }).limit(3).lean()
  ])

  const connectedDestinations = allDestinations.filter((d) => d.status === 'CONNECTED')

  const recentVideoIds = recentVideosRaw.map((v) => v._id)
  const publishJobs = await PublishJob.find({ userId, videoId: { $in: recentVideoIds } }).lean()

  const recentVideos = recentVideosRaw.map((v) => {
    const jobs = publishJobs.filter((j) => j.videoId.toString() === v._id.toString())
    const published = jobs.some((j) => j.status === 'PUBLISHED')
    return {
      id: v._id.toString(),
      title: v.title,
      durationSeconds: v.durationSeconds || 0,
      uploadedAt: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
      sizeBytes: v.fileSizeBytes || 0,
      status: published ? 'READY' : v.status || 'READY'
    }
  })

  const recentActivity = recentActivityRaw.map((a) => ({
    id: a._id.toString(),
    message: a.message,
    status: a.status,
    platform: a.platform,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString()
  }))

  const upcoming = upcomingRaw.map((s) => ({
    id: s._id.toString(),
    title: s.title,
    scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString() : new Date().toISOString(),
    platforms: ['YOUTUBE']
  }))

  const allPlatformKeys = Object.keys(PLATFORM_CONFIG)
  const connectedPlatforms = allPlatformKeys.map((key) => {
    const d = allDestinations.find((dest) => dest.platform === key)
    return {
      id: d ? d._id.toString() : key,
      platform: key,
      status: d ? d.status : 'NOT_CONNECTED'
    }
  })

  return NextResponse.json({
    metrics: {
      connectedCount: connectedDestinations.length,
      totalPlatforms: allPlatformKeys.length,
      totalVideos,
      upcomingScheduledCount,
      activeLiveStream: activeLiveStream ? { title: activeLiveStream.title } : null,
      storageUsedBytes: user?.storageUsedBytes || 0,
      storageLimitBytes: user?.storageLimitBytes || 5 * 1024 * 1024 * 1024
    },
    recentVideos,
    recentActivity,
    upcoming,
    destinations: connectedPlatforms
  })
}
