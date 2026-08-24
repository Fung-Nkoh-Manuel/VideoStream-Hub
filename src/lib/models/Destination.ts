import { Schema, model, models, Document, Types } from 'mongoose'

export type PlatformKey = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK' | 'TWITCH' | 'LINKEDIN' | 'X' | 'CUSTOM_RTMP'
export type ConnectionStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'ERROR' | 'SETUP_REQUIRED'

export interface IDestination extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  platform: PlatformKey
  accountName?: string
  externalAccountId?: string
  status: ConnectionStatus
  // Tokens are never sent to the client — see /api/destinations serializer.
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  scopes?: string
  createdAt: Date
  updatedAt: Date
}

const DestinationSchema = new Schema<IDestination>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['YOUTUBE', 'TIKTOK', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'X', 'CUSTOM_RTMP'], required: true },
    accountName: String,
    externalAccountId: String,
    status: { type: String, enum: ['NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'EXPIRED', 'ERROR', 'SETUP_REQUIRED'], default: 'NOT_CONNECTED' },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: Date,
    scopes: String
  },
  { timestamps: true }
)

export interface IDestinationGroup extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  name: string
  destinationIds: Types.ObjectId[]
  createdAt: Date
}

const DestinationGroupSchema = new Schema<IDestinationGroup>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    destinationIds: [{ type: Schema.Types.ObjectId, ref: 'Destination' }]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Destination = models.Destination || model<IDestination>('Destination', DestinationSchema)
export const DestinationGroup = models.DestinationGroup || model<IDestinationGroup>('DestinationGroup', DestinationGroupSchema)
