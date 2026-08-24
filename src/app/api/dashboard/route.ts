import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Video, { IVideo } from '@/lib/models/Video'
import User, { IUser } from '@/lib/models/User'
import { Destination, IDestination } from '@/lib/models/Destination'
import ScheduledItem, { IScheduledItem } from '@/lib/models/ScheduledItem'
import { ActivityLog, IActivityLog } from '@/lib/models/Activity'
import LiveStream, { ILiveStream } from '@/lib/models/LiveStream'
import PublishJob, { IPublishJob } from '@/lib/models/PublishJob'
import { PLATFORM_CONFIG } from '@/lib/platform-connectors'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const userId = session.user.id

  const user = (await User.findById(userId).lean()) as unknown as IUser | null
  const allDestinations = (await Destination.find({ userId }).lean()) as unknown as IDestination[]
  const totalVideos = await Video.countDocuments({ userId })
  const upcomingScheduledCount = await ScheduledItem.countDocuments({ userId, status: 'SCHEDULED' })
  const activeLiveStream = (await LiveStream.findOne({ userId, status: 'LIVE' }).lean()) as unknown as ILiveStream | null
  const recentVideosRaw = (await Video.find({ userId }).sort({ createdAt: -1 }).limit(4).lean()) as unknown as IVideo[]
  const recentActivityRaw = (await ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(5).lean()) as unknown as IActivityLog[]
  const upcomingRaw = (await ScheduledItem.find({ userId, status: 'SCHEDULED' }).sort({ scheduledAt: 1 }).limit(3).lean()) as unknown as IScheduledItem[]

  const connectedDestinations = allDestinations.filter((d) => d.status === 'CONNECTED')

  const recentVideoIds = recentVideosRaw.map((v) => v._id)
  const publishJobs = (await PublishJob.find({ userId, videoId: { $in: recentVideoIds } }).lean()) as unknown as IPublishJob[]

  const recentVideos = recentVideosRaw.map((v) => {
    const jobs = publishJobs.filter((j) => String(j.videoId) === String(v._id))
    const published = jobs.some((j) => j.status === 'PUBLISHED')
    return {
      id: String(v._id),
      title: v.title,
      durationSeconds: v.durationSeconds || 0,
      uploadedAt: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
      sizeBytes: v.fileSizeBytes || 0,
      status: published ? 'READY' : v.status || 'READY'
    }
  })

  const recentActivity = recentActivityRaw.map((a) => ({
    id: String(a._id),
    message: a.message,
    status: a.status,
    platform: a.platform,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString()
  }))

  const upcoming = upcomingRaw.map((s) => ({
    id: String(s._id),
    title: s.title,
    scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString() : new Date().toISOString(),
    platforms: ['YOUTUBE']
  }))

  const allPlatformKeys = Object.keys(PLATFORM_CONFIG)
  const connectedPlatforms = allPlatformKeys.map((key) => {
    const d = allDestinations.find((dest) => dest.platform === key)
    return {
      id: d ? String(d._id) : key,
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
