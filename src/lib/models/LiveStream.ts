import { Schema, model, models, Document, Types } from 'mongoose'

export type StreamStatus = 'IDLE' | 'STARTING' | 'LIVE' | 'STOPPING' | 'ENDED' | 'ERROR'
export type StreamDestStatus = 'PENDING' | 'LIVE' | 'STOPPED' | 'ERROR'
export type StreamSourceType = 'ENCODER' | 'PRERECORDED'

export interface IStreamDestination {
  destinationId: Types.ObjectId
  status: StreamDestStatus
  viewerCount?: number
  errorMessage?: string
  platformBroadcastId?: string
  platformPostUrl?: string
  rtmpUrl?: string
}

export interface ILiveStream extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  title: string
  description?: string
  status: StreamStatus
  sourceType?: StreamSourceType
  videoId?: Types.ObjectId
  videoUrl?: string
  streamKey: string
  rtmpIngestUrl?: string
  providerStreamId?: string // id from the streaming relay provider, see streaming-provider.ts
  destinations: IStreamDestination[]
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
}

const StreamDestinationSchema = new Schema<IStreamDestination>(
  {
    destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', required: true },
    status: { type: String, enum: ['PENDING', 'LIVE', 'STOPPED', 'ERROR'], default: 'PENDING' },
    viewerCount: Number,
    errorMessage: String,
    platformBroadcastId: String,
    platformPostUrl: String,
    rtmpUrl: String
  },
  { _id: false }
)

const LiveStreamSchema = new Schema<ILiveStream>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ['IDLE', 'STARTING', 'LIVE', 'STOPPING', 'ENDED', 'ERROR'], default: 'IDLE' },
    sourceType: { type: String, enum: ['ENCODER', 'PRERECORDED'], default: 'ENCODER' },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    videoUrl: String,
    streamKey: { type: String, required: true, select: false },
    rtmpIngestUrl: String,
    providerStreamId: String,
    destinations: { type: [StreamDestinationSchema], default: [] },
    startedAt: Date,
    endedAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export default models.LiveStream || model<ILiveStream>('LiveStream', LiveStreamSchema)
