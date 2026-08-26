import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Video, { IVideo } from '@/lib/models/Video'
import User from '@/lib/models/User'
import PublishJob, { IPublishJob } from '@/lib/models/PublishJob'
import { ActivityLog } from '@/lib/models/Activity'
import cloudinary from '@/lib/cloudinary'

// GET /api/videos — the authenticated user's videos only with real publish statuses.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()

  const rawVideos = (await Video.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean()) as unknown as IVideo[]
  const videoIds = rawVideos.map((v) => v._id)

  const publishJobs = (await PublishJob.find({
    userId: session.user.id,
    videoId: { $in: videoIds }
  }).lean()) as unknown as IPublishJob[]

  const videos = rawVideos.map((v) => {
    const jobs = publishJobs.filter((j) => String(j.videoId) === String(v._id))
    const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED')
    const failedJobs = jobs.filter((j) => j.status === 'FAILED')
    const publishingJobs = jobs.filter((j) => j.status === 'PUBLISHING')

    let publishStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' = 'DRAFT'
    if (publishedJobs.length > 0) {
      publishStatus = 'PUBLISHED'
    } else if (publishingJobs.length > 0) {
      publishStatus = 'DRAFT'
    } else if (failedJobs.length > 0) {
      publishStatus = 'FAILED'
    }

    const platforms = Array.from(
      new Set(
        publishedJobs
          .map(() => 'YOUTUBE')
      )
    )

    return {
      id: String(v._id),
      _id: String(v._id),
      title: v.title,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl || '/thumbs/thumb1.svg',
      durationSeconds: v.durationSeconds || 0,
      uploadedAt: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
      status: v.status || 'READY',
      publishStatus,
      platforms,
      visibility: v.visibility || 'PRIVATE',
      sizeBytes: v.fileSizeBytes || 0,
      originalFileUrl: v.originalFileUrl,
      publishJobs: jobs.map((j) => ({
        id: String(j._id),
        status: j.status,
        platform: 'YOUTUBE',
        platformPostId: j.platformPostId,
        platformPostUrl: j.platformPostUrl,
        errorMessage: j.errorMessage,
        publishedAt: j.publishedAt ? new Date(j.publishedAt).toISOString() : null,
        createdAt: new Date(j.createdAt).toISOString()
      }))
    }
  })

  return NextResponse.json({ videos })
}

const createSchema = z.object({
  title: z.string().min(1),
  cloudinaryPublicId: z.string().min(1),
  originalFileUrl: z.string().url(),
  originalFileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  durationSeconds: z.number().optional(),
  thumbnailUrl: z.string().url().optional()
})

// POST /api/videos — registers a video record AFTER file direct-upload
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 })
  }
  const { title, cloudinaryPublicId, originalFileUrl, originalFileName, fileSizeBytes, durationSeconds, thumbnailUrl } = parsed.data

  await connectToDatabase()

  const user = await User.findById(session.user.id)
  if (user && fileSizeBytes + user.storageUsedBytes > user.storageLimitBytes) {
    return NextResponse.json({ error: 'This upload would exceed your storage limit.' }, { status: 413 })
  }

  const video = await Video.create({
    userId: session.user.id,
    title,
    cloudinaryPublicId,
    originalFileUrl,
    originalFileName,
    fileSizeBytes,
    durationSeconds,
    thumbnailUrl,
    status: 'READY'
  })

  await User.updateOne({ _id: session.user.id }, { $inc: { storageUsedBytes: fileSizeBytes } })
  await ActivityLog.create({ userId: session.user.id, videoId: video._id, type: 'UPLOAD', status: 'SUCCESS', message: `${title} uploaded, processing started` })

  return NextResponse.json({ video })
}

// DELETE /api/videos?id=<id> — deletes video, associated Cloudinary media, storage usage, & publish jobs
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })

  await connectToDatabase()

  const video = await Video.findOne({ _id: id, userId: session.user.id })
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  // 1. Delete asset from Cloudinary
  if (video.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' })
    } catch (cloudErr) {
      console.warn('Cloudinary asset deletion error:', cloudErr)
    }
  }

  // 2. Decrement user storage usage
  const sizeToReduce = video.fileSizeBytes || 0
  await User.updateOne(
    { _id: session.user.id },
    { $inc: { storageUsedBytes: -sizeToReduce } }
  )

  // 3. Delete related PublishJob documents
  await PublishJob.deleteMany({ videoId: id })

  // 4. Delete Video document
  await Video.deleteOne({ _id: id })

  // 5. Log activity
  await ActivityLog.create({
    userId: session.user.id,
    type: 'PROCESSING',
    status: 'SUCCESS',
    message: `Deleted video "${video.title}"`
  })

  return NextResponse.json({ success: true })
}
