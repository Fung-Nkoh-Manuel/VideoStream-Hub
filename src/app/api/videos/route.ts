import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import Video from '@/lib/models/Video'
import User from '@/lib/models/User'
import { ActivityLog } from '@/lib/models/Activity'

// GET /api/videos — the authenticated user's videos only. Every query in
// this file filters by session.user.id so one user can never see, edit,
// or delete another user's videos — the session identity is the only
// source of truth for ownership, never a client-supplied id.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectToDatabase()
  const videos = await Video.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ videos })
}

const createSchema = z.object({
  title: z.string().min(1),
  cloudinaryPublicId: z.string().min(1),
  originalFileUrl: z.string().url(),
  originalFileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  durationSeconds: z.number().optional(),
  thumbnailUrl: z.string().url().optional()
})

// POST /api/videos — registers a video record AFTER the file has already
// landed in Cloudinary via the signed direct-upload flow (see
// /api/upload/sign and src/app/upload/page.tsx). This endpoint never
// receives raw video bytes, keeping it well under Vercel's request limits.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 })
  }
  const { title, cloudinaryPublicId, originalFileUrl, originalFileName, fileSizeBytes, durationSeconds, thumbnailUrl } = parsed.data

  await connectToDatabase()

  const user = await User.findById(session.user.id)
  if (user && fileSizeBytes + user.storageUsedBytes > user.storageLimitBytes) {
    return NextResponse.json({ error: 'This upload would exceed your storage limit.' }, { status: 413 })
  }

  const video = await Video.create({
    userId: session.user.id,
    title,
    cloudinaryPublicId,
    originalFileUrl,
    originalFileName,
    fileSizeBytes,
    durationSeconds,
    thumbnailUrl,
    status: 'PROCESSING'
  })

  await User.updateOne({ _id: session.user.id }, { $inc: { storageUsedBytes: fileSizeBytes } })
  await ActivityLog.create({ userId: session.user.id, videoId: video._id, type: 'UPLOAD', status: 'SUCCESS', message: `${title} uploaded, processing started` })

  return NextResponse.json({ video })
}
