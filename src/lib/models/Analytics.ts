import { Schema, model, models, Document, Types } from 'mongoose'
import { PlatformKey } from './Destination'

export interface IAnalyticsSnapshot extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  destinationId?: Types.ObjectId
  videoId?: Types.ObjectId
  platform: PlatformKey
  views: number
  likes: number
  comments: number
  shares: number
  newFollowers: number
  watchTimeMinutes: number
  capturedAt: Date
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  destinationId: { type: Schema.Types.ObjectId, ref: 'Destination' },
  videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
  platform: { type: String, enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'X', 'CUSTOM_RTMP'], required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  newFollowers: { type: Number, default: 0 },
  watchTimeMinutes: { type: Number, default: 0 },
  capturedAt: { type: Date, default: Date.now, index: true }
})

// Real snapshots are written by a sync job that calls each platform's
// analytics endpoint (YouTube Analytics API, TikTok, Meta Graph API) once
// that destination is connected — never fabricated client-side.
export default models.AnalyticsSnapshot || model<IAnalyticsSnapshot>('AnalyticsSnapshot', AnalyticsSnapshotSchema)
