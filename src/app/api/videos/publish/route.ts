import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Video from '@/lib/models/Video'
import { Destination } from '@/lib/models/Destination'
import PublishJob from '@/lib/models/PublishJob'
import { ActivityLog } from '@/lib/models/Activity'
import { getConnector } from '@/lib/platform-connectors'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videoId, title, description, visibility } = (await req.json()) as {
    videoId: string
    title?: string
    description?: string
    visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  }

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  await connectToDatabase()

  // 1. Verify user owns the video
  const video = await Video.findOne({ _id: videoId, userId: session.user.id })
  if (!video) {
    return NextResponse.json({ error: 'Video not found or access denied.' }, { status: 404 })
  }

  // 2. Verify YouTube destination is connected for user
  const destination = await Destination.findOne({
    userId: session.user.id,
    platform: 'YOUTUBE',
    status: 'CONNECTED'
  }).select('+accessToken +refreshToken')

  if (!destination || !destination.accessToken) {
    return NextResponse.json(
      { error: 'YouTube is not connected. Please connect your YouTube account under Destinations first.' },
      { status: 400 }
    )
  }

  // 3. Create or update PublishJob record in QUEUED / PUBLISHING state
  let publishJob = await PublishJob.findOne({
    userId: session.user.id,
    videoId: video._id,
    destinationId: destination._id
  })

  if (!publishJob) {
    publishJob = await PublishJob.create({
      userId: session.user.id,
      videoId: video._id,
      destinationId: destination._id,
      status: 'PUBLISHING',
      platformMetadata: { title: title || video.title, description: description || video.description }
    })
  } else {
    publishJob.status = 'PUBLISHING'
    publishJob.errorMessage = undefined
    await publishJob.save()
  }

  // 4. Perform actual YouTube API publishing call
  try {
    const connector = getConnector('YOUTUBE')
    const result = await connector.publish(destination.accessToken, {
      videoAssetUrl: video.originalFileUrl,
      title: title || video.title,
      description: description || video.description || '',
      visibility: visibility || video.visibility || 'PUBLIC'
    })

    publishJob.status = 'PUBLISHED'
    publishJob.platformPostId = result.platformPostId
    publishJob.platformPostUrl = result.platformPostUrl
    publishJob.publishedAt = new Date()
    await publishJob.save()

    await ActivityLog.create({
      userId: session.user.id,
      videoId: video._id,
      type: 'PUBLISH',
      status: 'SUCCESS',
      message: `Successfully published "${video.title}" to YouTube`,
      platform: 'YOUTUBE'
    })

    return NextResponse.json({
      success: true,
      publishJob: {
        id: publishJob._id.toString(),
        status: publishJob.status,
        platformPostId: publishJob.platformPostId,
        platformPostUrl: publishJob.platformPostUrl,
        publishedAt: publishJob.publishedAt
      }
    })
  } catch (err: any) {
    publishJob.status = 'FAILED'
    publishJob.errorMessage = err.message || 'Publishing to YouTube failed'
    await publishJob.save()

    await ActivityLog.create({
      userId: session.user.id,
      videoId: video._id,
      type: 'PUBLISH',
      status: 'ERROR',
      message: `Failed to publish "${video.title}" to YouTube: ${err.message}`,
      platform: 'YOUTUBE'
    })

    return NextResponse.json(
      { error: err.message || 'Publishing to YouTube failed.' },
      { status: 500 }
    )
  }
}
