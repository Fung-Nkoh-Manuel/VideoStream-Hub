export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
export type PublishStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED'

export interface VideoItem {
  id: string
  title: string
  thumbnailUrl: string
  durationSeconds: number
  uploadedAt: string
  status: VideoStatus
  publishStatus: PublishStatus
  platforms: PlatformKey[]
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  sizeBytes: number
}

export type PlatformKey = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK' | 'TWITCH' | 'LINKEDIN' | 'X' | 'CUSTOM_RTMP'

export type ConnectionStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'ERROR' | 'SETUP_REQUIRED'

export interface DestinationItem {
  id: string
  platform: PlatformKey
  accountName: string | null
  status: ConnectionStatus
}

export interface ScheduledItemUI {
  id: string
  title: string
  type: 'VIDEO_PUBLISH' | 'LIVE_STREAM' | 'PRERECORDED_LIVE'
  scheduledAt: string
  platforms: PlatformKey[]
  status: 'SCHEDULED' | 'PREPARING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
}

export interface ActivityItem {
  id: string
  type: string
  status: 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  platform?: PlatformKey
  createdAt: string
}
