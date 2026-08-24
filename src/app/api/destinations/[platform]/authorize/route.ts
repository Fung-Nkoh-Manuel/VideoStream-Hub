import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConnector, isPlatformConfigured, PlatformKey } from '@/lib/platform-connectors'

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const platformKey = params.platform.toUpperCase() as PlatformKey
  if (!isPlatformConfigured(platformKey)) {
    return NextResponse.redirect(new URL(`/destinations?error=Platform+not+configured`, req.url))
  }

  try {
    const connector = getConnector(platformKey)
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const authorizeUrl = connector.getAuthorizeUrl(state)

    const res = NextResponse.redirect(authorizeUrl)
    res.cookies.set('vsh_oauth_state', state, { httpOnly: true, path: '/', maxAge: 600 })
    return res
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/destinations?error=${encodeURIComponent(err.message)}`, req.url))
  }
}
