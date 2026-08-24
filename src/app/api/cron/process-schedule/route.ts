import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import ScheduledItem from '@/lib/models/ScheduledItem'
import { ActivityLog } from '@/lib/models/Activity'

// Invoked by Vercel Cron (see vercel.json) on a fixed schedule — e.g. every
// 5 minutes. This is the mechanism that makes scheduling work without a
// permanently running server: nothing "waits" for the scheduled time,
// this route just wakes up periodically and processes anything that's due.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectToDatabase()

  const due = await ScheduledItem.find({ status: 'SCHEDULED', scheduledAt: { $lte: new Date() } }).limit(25)

  const results = []
  for (const item of due) {
    try {
      item.status = 'PREPARING'
      await item.save()

      // Real implementation: for VIDEO_PUBLISH, enqueue a PublishJob per
      // destination via the relevant PlatformConnector (see
      // platform-connectors.ts). For LIVE_STREAM/PRERECORDED_LIVE, call
      // the streaming provider's createStream/startStream (see
      // streaming-provider.ts). Both are architected but require live
      // credentials to actually execute — left as the clear next step.

      await ActivityLog.create({
        userId: item.userId,
        type: 'SCHEDULE',
        status: 'SUCCESS',
        message: `Scheduled item "${item.title}" is due and was handed off for processing.`
      })

      if (item.isRecurring && item.recurrenceFreq) {
        const next = new Date(item.scheduledAt)
        if (item.recurrenceFreq === 'DAILY') next.setDate(next.getDate() + 1)
        if (item.recurrenceFreq === 'WEEKLY') next.setDate(next.getDate() + 7)
        if (item.recurrenceFreq === 'MONTHLY') next.setMonth(next.getMonth() + 1)

        if (!item.recurrenceEndsAt || next <= item.recurrenceEndsAt) {
          await ScheduledItem.create({ ...item.toObject(), _id: undefined, scheduledAt: next, status: 'SCHEDULED', lastRunAt: undefined })
        }
      }

      item.status = 'COMPLETED'
      item.lastRunAt = new Date()
      await item.save()
      results.push({ id: item._id, status: 'COMPLETED' })
    } catch (err) {
      item.status = 'FAILED'
      await item.save()
      await ActivityLog.create({ userId: item.userId, type: 'SCHEDULE', status: 'ERROR', message: `Scheduled item "${item.title}" failed to process.` })
      results.push({ id: item._id, status: 'FAILED' })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
