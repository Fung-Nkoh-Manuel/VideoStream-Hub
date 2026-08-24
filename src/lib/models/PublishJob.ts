import { Schema, model, models, Document, Types } from 'mongoose'

export type JobStatus = 'QUEUED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED'

export interface IPublishJob extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  videoId: Types.ObjectId
  destinationId: Types.ObjectId
  status: JobStatus
  // Per-platform metadata overrides (title/description/visibility/etc.)
  platformMetadata?: Record<string, unknown>
  scheduledFor?: Date
  publishedAt?: Date
  platformPostId?: string
  platformPostUrl?: string
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

const PublishJobSchema = new Schema<IPublishJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
    status: { type: String, enum: ['QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED'], default: 'QUEUED' },
    platformMetadata: { type: Schema.Types.Mixed },
    scheduledFor: Date,
    publishedAt: Date,
    platformPostId: String,
    platformPostUrl: String,
    errorMessage: String
  },
  { timestamps: true }
)

// Publishing is tracked per-destination so one platform's failure never
// touches another's record — see spec §15/§9 "independent tracking".
export default models.PublishJob || model<IPublishJob>('PublishJob', PublishJobSchema)
