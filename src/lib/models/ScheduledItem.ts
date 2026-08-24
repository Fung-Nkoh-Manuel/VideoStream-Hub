import { Schema, model, models, Document, Types } from 'mongoose'

export type ScheduledType = 'VIDEO_PUBLISH' | 'LIVE_STREAM' | 'PRERECORDED_LIVE'
export type ScheduleStatus = 'SCHEDULED' | 'PREPARING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface IScheduledItem extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  videoId?: Types.ObjectId
  destinationIds: Types.ObjectId[]
  type: ScheduledType
  title: string
  scheduledAt: Date
  timezone: string
  status: ScheduleStatus
  isRecurring: boolean
  recurrenceFreq?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  recurrenceEndsAt?: Date
  lastRunAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ScheduledItemSchema = new Schema<IScheduledItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    destinationIds: [{ type: Schema.Types.ObjectId, ref: 'Destination' }],
    type: { type: String, enum: ['VIDEO_PUBLISH', 'LIVE_STREAM', 'PRERECORDED_LIVE'], required: true },
    title: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'UTC' },
    status: { type: String, enum: ['SCHEDULED', 'PREPARING', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'SCHEDULED' },
    isRecurring: { type: Boolean, default: false },
    recurrenceFreq: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
    recurrenceEndsAt: Date,
    lastRunAt: Date
  },
  { timestamps: true }
)

// Vercel Cron (see /api/cron/process-schedule + vercel.json) polls for
// SCHEDULED items whose scheduledAt has passed — no long-running process
// is required, which is what makes this safe on serverless.
ScheduledItemSchema.index({ status: 1, scheduledAt: 1 })

export default models.ScheduledItem || model<IScheduledItem>('ScheduledItem', ScheduledItemSchema)
