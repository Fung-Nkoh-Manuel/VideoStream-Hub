import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import cloudinary, { isCloudinaryConfigured } from '@/lib/cloudinary'

// The browser uploads the video file DIRECTLY to Cloudinary using the
// signature this route returns — the video's bytes never pass through a
// Vercel serverless function, which is required since those have request
// body limits Video files routinely exceed. See src/app/upload/page.tsx.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Media storage is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.' },
      { status: 503 }
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `videostream-hub/${session.user.id}`

  const paramsToSign = { timestamp, folder, resource_type: 'video' }
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET as string
  )

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`
  })
}
