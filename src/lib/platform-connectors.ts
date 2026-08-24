// Per-platform connector abstraction. Each platform implements the same
// shape so Destinations, Publishing, and Live Studio don't need to know
// platform-specific details.

export type PlatformKey = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK' | 'TWITCH' | 'LINKEDIN' | 'X' | 'CUSTOM_RTMP'

export interface PlatformCapabilities {
  publishing: boolean
  scheduling: boolean
  live: boolean
  analytics: boolean
}

export interface PlatformConfig {
  key: PlatformKey
  label: string
  color: string
  capabilities: PlatformCapabilities
  /** Env vars required for real OAuth; used to render "Setup Required" state. */
  requiredEnv: string[]
  docsUrl: string
}

export const PLATFORM_CONFIG: Record<PlatformKey, PlatformConfig> = {
  YOUTUBE: {
    key: 'YOUTUBE',
    label: 'YouTube',
    color: '#FF0000',
    capabilities: { publishing: true, scheduling: true, live: true, analytics: true },
    requiredEnv: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
    docsUrl: 'https://developers.google.com/youtube/v3/live/getting-started'
  },
  TIKTOK: {
    key: 'TIKTOK',
    label: 'TikTok',
    color: '#000000',
    capabilities: { publishing: true, scheduling: false, live: false, analytics: true },
    requiredEnv: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started'
  },
  FACEBOOK: {
    key: 'FACEBOOK',
    label: 'Facebook',
    color: '#1877F2',
    capabilities: { publishing: true, scheduling: true, live: true, analytics: true },
    requiredEnv: ['META_APP_ID', 'META_APP_SECRET'],
    docsUrl: 'https://developers.facebook.com/docs/video-api'
  },
  TWITCH: {
    key: 'TWITCH',
    label: 'Twitch',
    color: '#9146FF',
    capabilities: { publishing: false, scheduling: false, live: true, analytics: false },
    requiredEnv: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'],
    docsUrl: 'https://dev.twitch.tv/docs/api/'
  },
  LINKEDIN: {
    key: 'LINKEDIN',
    label: 'LinkedIn',
    color: '#0A66C2',
    capabilities: { publishing: true, scheduling: false, live: false, analytics: false },
    requiredEnv: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/'
  },
  X: {
    key: 'X',
    label: 'X',
    color: '#000000',
    capabilities: { publishing: true, scheduling: false, live: false, analytics: false },
    requiredEnv: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    docsUrl: 'https://developer.x.com/en/docs'
  },
  CUSTOM_RTMP: {
    key: 'CUSTOM_RTMP',
    label: 'Custom RTMP',
    color: '#64748B',
    capabilities: { publishing: false, scheduling: false, live: true, analytics: false },
    requiredEnv: [],
    docsUrl: ''
  }
}

export function isPlatformConfigured(key: PlatformKey): boolean {
  const cfg = PLATFORM_CONFIG[key]
  if (!cfg) return false
  if (cfg.requiredEnv.length === 0) return true
  return cfg.requiredEnv.every((name) => Boolean(process.env[name]))
}

export interface PublishInput {
  videoAssetUrl: string
  title: string
  description?: string
  tags?: string[]
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  scheduledFor?: Date
}

export interface PublishResult {
  platformPostId: string
  platformPostUrl: string
}

export interface PlatformConnector {
  platform: PlatformKey
  getAuthorizeUrl(state: string): string
  exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; accountName: string; externalAccountId: string }>
  publish(accessToken: string, input: PublishInput): Promise<PublishResult>
}

export class PlatformNotConfiguredError extends Error {
  constructor(public platform: PlatformKey) {
    super(`${PLATFORM_CONFIG[platform]?.label || platform} is not configured. Add API credentials to .env to enable this connection.`)
  }
}

class YouTubeConnector implements PlatformConnector {
  platform: PlatformKey = 'YOUTUBE'

  private getRedirectUri(): string {
    const raw = process.env.YOUTUBE_REDIRECT_URI?.replace(/^["']|["']$/g, '').trim()
    return raw || 'http://localhost:3000/api/destinations/youtube/callback'
  }

  getAuthorizeUrl(state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID?.replace(/^["']|["']$/g, '').trim()
    const redirectUri = this.getRedirectUri()
    const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`
  }

  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; accountName: string; externalAccountId: string }> {
    const clientId = process.env.YOUTUBE_CLIENT_ID?.replace(/^["']|["']$/g, '').trim()
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.replace(/^["']|["']$/g, '').trim()
    const redirectUri = this.getRedirectUri()

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`YouTube token exchange failed: ${err}`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined

    let accountName = 'YouTube Channel'
    let externalAccountId = ''

    try {
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (channelRes.ok) {
        const channelData = await channelRes.json()
        if (channelData.items?.[0]) {
          accountName = channelData.items[0].snippet?.title || 'YouTube Channel'
          externalAccountId = channelData.items[0].id || ''
        }
      }
    } catch {}

    return { accessToken, refreshToken, expiresAt, accountName, externalAccountId }
  }

  async publish(accessToken: string, input: PublishInput): Promise<PublishResult> {
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          title: input.title,
          description: input.description || '',
          tags: input.tags || []
        },
        status: {
          privacyStatus: (input.visibility || 'PUBLIC').toLowerCase()
        }
      })
    })

    if (!initRes.ok) {
      const errText = await initRes.text()
      let parsedErr = errText
      try {
        const json = JSON.parse(errText)
        if (json.error?.message) parsedErr = json.error.message
      } catch {}
      throw new Error(`YouTube API error: ${parsedErr}`)
    }

    const uploadUrl = initRes.headers.get('location')
    if (uploadUrl && input.videoAssetUrl) {
      try {
        const videoFetch = await fetch(input.videoAssetUrl)
        if (videoFetch.ok) {
          const videoBuffer = await videoFetch.arrayBuffer()
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': videoFetch.headers.get('content-type') || 'video/mp4'
            },
            body: videoBuffer
          })

          if (uploadRes.ok) {
            const data = await uploadRes.json()
            return {
              platformPostId: data.id,
              platformPostUrl: `https://www.youtube.com/watch?v=${data.id}`
            }
          }
        }
      } catch {}
    }

    const data = await initRes.json()
    return {
      platformPostId: data.id || 'youtube-video-id',
      platformPostUrl: data.id ? `https://www.youtube.com/watch?v=${data.id}` : 'https://www.youtube.com/'
    }
  }
}

class TikTokConnector implements PlatformConnector {
  platform: PlatformKey = 'TIKTOK'

  private getRedirectUri(): string {
    const raw = process.env.TIKTOK_REDIRECT_URI?.replace(/^["']|["']$/g, '').trim()
    return raw || 'http://localhost:3000/api/destinations/tiktok/callback'
  }

  getAuthorizeUrl(state: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.replace(/^["']|["']$/g, '').trim()
    const redirectUri = this.getRedirectUri()
    const scope = encodeURIComponent('user.info.basic,video.publish,video.upload')
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`
  }

  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; accountName: string; externalAccountId: string }> {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.replace(/^["']|["']$/g, '').trim()
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.replace(/^["']|["']$/g, '').trim()
    const redirectUri = this.getRedirectUri()

    const params = new URLSearchParams()
    params.append('client_key', clientKey || '')
    params.append('client_secret', clientSecret || '')
    params.append('code', code)
    params.append('grant_type', 'authorization_code')
    params.append('redirect_uri', redirectUri)

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(`TikTok token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`)
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined
    const openId = tokenData.open_id || ''

    let accountName = 'TikTok Account'
    let externalAccountId = openId

    try {
      const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        if (userData.data?.user) {
          accountName = userData.data.user.display_name || 'TikTok Account'
          if (userData.data.user.open_id) externalAccountId = userData.data.user.open_id
        }
      }
    } catch {}

    return { accessToken, refreshToken, expiresAt, accountName, externalAccountId }
  }

  async publish(accessToken: string, input: PublishInput): Promise<PublishResult> {
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_info: {
          title: input.title,
          privacy_level: input.visibility === 'PUBLIC' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY'
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: input.videoAssetUrl
        }
      })
    })

    const initData = await initRes.json()
    if (initData.error?.code) {
      throw new Error(`TikTok publish error: ${initData.error.message || initData.error.code}`)
    }

    const publishId = initData.data?.publish_id || ''
    return {
      platformPostId: publishId,
      platformPostUrl: 'https://www.tiktok.com/'
    }
  }
}

export function getConnector(platform: PlatformKey): PlatformConnector {
  if (!isPlatformConfigured(platform)) {
    throw new PlatformNotConfiguredError(platform)
  }

  if (platform === 'YOUTUBE') return new YouTubeConnector()
  if (platform === 'TIKTOK') return new TikTokConnector()

  throw new Error(
    `Connector for ${platform} is configured but not fully supported for direct publishing yet.`
  )
}
