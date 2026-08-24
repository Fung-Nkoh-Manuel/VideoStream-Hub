// Per-platform connector abstraction. Each platform implements the same
// shape so Destinations, Publishing, and Live Studio don't need to know
// platform-specific details. Add a new platform by adding one entry here —
// no other part of the app needs to change (see PLATFORM_CONFIG below,
// consumed by the Destinations page and the schema's Platform enum).

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
  if (cfg.requiredEnv.length === 0) return true // e.g. custom RTMP needs no app credentials
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
    super(`${PLATFORM_CONFIG[platform].label} is not configured. Add API credentials to .env to enable this connection.`)
  }
}

/**
 * Returns a connector for the given platform, or throws
 * PlatformNotConfiguredError if the required credentials aren't set.
 * Concrete connectors (YouTubeConnector, TikTokConnector, ...) should be
 * implemented against each platform's official API once credentials and
 * app review are in place — this factory is the single place that wires
 * them in, so no other code needs to change when one is added.
 */
export function getConnector(platform: PlatformKey): PlatformConnector {
  if (!isPlatformConfigured(platform)) {
    throw new PlatformNotConfiguredError(platform)
  }
  throw new Error(
    `Connector for ${platform} is credentialed but not yet implemented. Implement PlatformConnector in src/lib/platform-connectors.ts once you're ready to go live with this platform's API.`
  )
}
