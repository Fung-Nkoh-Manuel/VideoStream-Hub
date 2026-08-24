import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Destination } from '@/lib/models/Destination'
import { ActivityLog } from '@/lib/models/Activity'
import { getConnector } from '@/lib/platform-connectors'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/destinations?error=${encodeURIComponent(errorDescription || error || 'Authorization failed')}`, req.url)
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const connector = getConnector('TIKTOK')
    const tokens = await connector.exchangeCodeForTokens(code)

    await connectToDatabase()

    await Destination.findOneAndUpdate(
      { userId: session.user.id, platform: 'TIKTOK' },
      {
        userId: session.user.id,
        platform: 'TIKTOK',
        accountName: tokens.accountName,
        externalAccountId: tokens.externalAccountId,
        status: 'CONNECTED',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt
      },
      { upsert: true, new: true }
    )

    await ActivityLog.create({
      userId: session.user.id,
      type: 'AUTH',
      status: 'SUCCESS',
      message: `Successfully connected TikTok account (${tokens.accountName})`,
      platform: 'TIKTOK'
    })

    return NextResponse.redirect(new URL('/destinations?connected=tiktok', req.url))
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/destinations?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
