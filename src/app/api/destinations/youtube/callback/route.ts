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

  if (error || !code) {
    return NextResponse.redirect(new URL(`/destinations?error=${encodeURIComponent(error || 'Authorization failed')}`, req.url))
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const connector = getConnector('YOUTUBE')
    const tokens = await connector.exchangeCodeForTokens(code)

    await connectToDatabase()

    await Destination.findOneAndUpdate(
      { userId: session.user.id, platform: 'YOUTUBE' },
      {
        userId: session.user.id,
        platform: 'YOUTUBE',
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
      message: `Successfully connected YouTube channel (${tokens.accountName})`,
      platform: 'YOUTUBE'
    })

    return NextResponse.redirect(new URL('/destinations?connected=youtube', req.url))
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/destinations?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
