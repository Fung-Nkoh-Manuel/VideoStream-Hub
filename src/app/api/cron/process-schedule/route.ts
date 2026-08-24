import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import ScheduledItem from '@/lib/models/ScheduledItem'
import PublishJob from '@/lib/models/PublishJob'
import { ActivityLog } from '@/lib/models/Activity'
import { getStreamingProvider, isStreamingConfigured } from '@/lib/streaming-provider'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  // Find candidate items that are due
  const dueCandidates = await ScheduledItem.find({
    status: 'SCHEDULED',
    scheduledAt: { $lte: new Date() }
  }).limit(25)

  const results = []
  for (const candidate of dueCandidates) {
    // Atomic status transition from SCHEDULED -> PREPARING guarantees idempotency
    const item = await ScheduledItem.findOneAndUpdate(
      { _id: candidate._id, status: 'SCHEDULED' },
      { $set: { status: 'PREPARING' } },
      { new: true }
    )

    // If item is null, another process already claimed it
    if (!item) continue

    try {
      if (item.type === 'VIDEO_PUBLISH' && item.videoId) {
        for (const destId of item.destinationIds) {
          const existingJob = await PublishJob.findOne({
            videoId: item.videoId,
            destinationId: destId
          })
          if (!existingJob) {
            await PublishJob.create({
              userId: item.userId,
              videoId: item.videoId,
              destinationId: destId,
              status: 'QUEUED',
              scheduledFor: item.scheduledAt
            })
          }
        }
      } else if ((item.type === 'LIVE_STREAM' || item.type === 'PRERECORDED_LIVE') && isStreamingConfigured()) {
        try {
          const provider = getStreamingProvider()
          const stream = await provider.createStream({ title: item.title })
          await provider.startStream(stream.streamId)
        } catch {}
      }

      await ActivityLog.create({
        userId: item.userId,
        type: 'SCHEDULE',
        status: 'SUCCESS',
        message: `Scheduled item "${item.title}" processed successfully.`
      })

      if (item.isRecurring && item.recurrenceFreq) {
        const next = new Date(item.scheduledAt)
        if (item.recurrenceFreq === 'DAILY') next.setDate(next.getDate() + 1)
        if (item.recurrenceFreq === 'WEEKLY') next.setDate(next.getDate() + 7)
        if (item.recurrenceFreq === 'MONTHLY') next.setMonth(next.getMonth() + 1)

        if (!item.recurrenceEndsAt || next <= item.recurrenceEndsAt) {
          await ScheduledItem.create({
            ...item.toObject(),
            _id: undefined,
            scheduledAt: next,
            status: 'SCHEDULED',
            lastRunAt: undefined
          })
        }
      }

      item.status = 'COMPLETED'
      item.lastRunAt = new Date()
      await item.save()
      results.push({ id: item._id, status: 'COMPLETED' })
    } catch (err) {
      item.status = 'FAILED'
      await item.save()
      await ActivityLog.create({
        userId: item.userId,
        type: 'SCHEDULE',
        status: 'ERROR',
        message: `Scheduled item "${item.title}" failed to process.`
      })
      results.push({ id: item._id, status: 'FAILED' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

export async function POST(req: Request) {
  return GET(req)
}
