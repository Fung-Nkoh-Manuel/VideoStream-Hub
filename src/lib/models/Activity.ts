import { Schema, model, models, Document, Types } from 'mongoose'

export interface IActivityLog extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  videoId?: Types.ObjectId
  type: 'UPLOAD' | 'PROCESSING' | 'PUBLISH' | 'SCHEDULE' | 'STREAM' | 'AUTH' | 'CONNECTION'
  platform?: string
  status: 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  createdAt: Date
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    type: { type: String, enum: ['UPLOAD', 'PROCESSING', 'PUBLISH', 'SCHEDULE', 'STREAM', 'AUTH', 'CONNECTION'], required: true },
    platform: String,
    status: { type: String, enum: ['SUCCESS', 'WARNING', 'ERROR'], required: true },
    message: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)
ActivityLogSchema.index({ userId: 1, createdAt: -1 })

export interface INotification extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  title: string
  body: string
  read: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const ActivityLog = models.ActivityLog || model<IActivityLog>('ActivityLog', ActivityLogSchema)
export const Notification = models.Notification || model<INotification>('Notification', NotificationSchema)
