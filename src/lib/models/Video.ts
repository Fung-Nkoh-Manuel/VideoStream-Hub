import { Schema, model, models, Document, Types } from 'mongoose'

// A processed playback rendition (e.g. Cloudinary auto-generated 720p/480p
// eager transformation). Populated by the Cloudinary webhook once
// processing completes — see /api/webhooks/cloudinary.
export interface IVideoAsset {
  quality: string // "1080p" | "720p" | "480p" | "360p"
  url: string
  fileSizeBytes: number
}

export interface IVideo extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  title: string
  description?: string
  tags: string[]
  cloudinaryPublicId: string
  originalFileUrl: string // secure_url from Cloudinary
  originalFileName: string
  fileSizeBytes: number
  durationSeconds?: number
  thumbnailUrl?: string
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  assets: IVideoAsset[]
  createdAt: Date
  updatedAt: Date
}

const VideoAssetSchema = new Schema<IVideoAsset>(
  { quality: String, url: String, fileSizeBytes: Number },
  { _id: false }
)

const VideoSchema = new Schema<IVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    tags: { type: [String], default: [] },
    cloudinaryPublicId: { type: String, required: true },
    originalFileUrl: { type: String, required: true },
    originalFileName: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    durationSeconds: Number,
    thumbnailUrl: String,
    status: { type: String, enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'], default: 'UPLOADING' },
    visibility: { type: String, enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'], default: 'PRIVATE' },
    assets: { type: [VideoAssetSchema], default: [] }
  },
  { timestamps: true }
)

export default models.Video || model<IVideo>('Video', VideoSchema)
