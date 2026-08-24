import { Schema, model, models, Document, Types } from 'mongoose'

export interface IUser extends Document {
  _id: Types.ObjectId
  name?: string
  email: string
  passwordHash?: string
  image?: string
  emailVerified?: Date
  plan: 'FREE' | 'PRO' | 'BUSINESS'
  storageUsedBytes: number
  storageLimitBytes: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: String, // undefined when the user only ever used Google sign-in
    image: String,
    emailVerified: Date,
    plan: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], default: 'FREE' },
    storageUsedBytes: { type: Number, default: 0 },
    storageLimitBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 } // 5GB
  },
  { timestamps: true }
)

export default models.User || model<IUser>('User', UserSchema)
