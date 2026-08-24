// ---------------------------------------------------------------------
// DEMO DATA ONLY.
//
// Everything in this file exists to populate the UI during development
// so every screen can be reviewed before real accounts/videos exist.
// It is never used for production logic — real pages should read from
// MongoDB (see src/lib/mongodb.ts + src/lib/models/*) via the API routes
// in src/app/api/*.
// Swap a page from mock data to live data by replacing the import below
// with a fetch to its matching API route.
// ---------------------------------------------------------------------
import { VideoItem, DestinationItem, ScheduledItemUI, ActivityItem } from './types'

export const mockVideos: VideoItem[] = [
  { id: 'v1', title: 'Sunday Service — Aug 17', thumbnailUrl: '/thumbs/thumb1.svg', durationSeconds: 3820, uploadedAt: '2026-08-17T14:02:00Z', status: 'READY', publishStatus: 'PUBLISHED', platforms: ['YOUTUBE', 'FACEBOOK'], visibility: 'PUBLIC', sizeBytes: 2_400_000_000 },
  { id: 'v2', title: 'Behind the Scenes: Studio Rebuild', thumbnailUrl: '/thumbs/thumb2.svg', durationSeconds: 542, uploadedAt: '2026-08-19T09:15:00Z', status: 'READY', publishStatus: 'PARTIALLY_PUBLISHED', platforms: ['YOUTUBE', 'TIKTOK', 'FACEBOOK'], visibility: 'PUBLIC', sizeBytes: 340_000_000 },
  { id: 'v3', title: 'Quick Announcement', thumbnailUrl: '/thumbs/thumb3.svg', durationSeconds: 46, uploadedAt: '2026-08-21T18:40:00Z', status: 'PROCESSING', publishStatus: 'DRAFT', platforms: [], visibility: 'PRIVATE', sizeBytes: 58_000_000 },
  { id: 'v4', title: 'Worship Highlights Reel', thumbnailUrl: '/thumbs/thumb4.svg', durationSeconds: 128, uploadedAt: '2026-08-22T11:05:00Z', status: 'READY', publishStatus: 'SCHEDULED', platforms: ['TIKTOK'], visibility: 'PUBLIC', sizeBytes: 96_000_000 },
  { id: 'v5', title: 'Q&A with the Team (raw)', thumbnailUrl: '/thumbs/thumb5.svg', durationSeconds: 2110, uploadedAt: '2026-08-23T20:00:00Z', status: 'FAILED', publishStatus: 'FAILED', platforms: [], visibility: 'PRIVATE', sizeBytes: 1_800_000_000 },
  { id: 'v6', title: 'Sunday Service — Aug 10', thumbnailUrl: '/thumbs/thumb1.svg', durationSeconds: 3690, uploadedAt: '2026-08-10T14:05:00Z', status: 'READY', publishStatus: 'PUBLISHED', platforms: ['YOUTUBE', 'FACEBOOK', 'TIKTOK'], visibility: 'PUBLIC', sizeBytes: 2_310_000_000 }
]

export const mockDestinations: DestinationItem[] = [
  { id: 'd1', platform: 'YOUTUBE', accountName: 'Main Channel', status: 'CONNECTED' },
  { id: 'd2', platform: 'FACEBOOK', accountName: 'Church Page', status: 'CONNECTED' },
  { id: 'd3', platform: 'TIKTOK', accountName: null, status: 'SETUP_REQUIRED' },
  { id: 'd4', platform: 'TWITCH', accountName: null, status: 'SETUP_REQUIRED' },
  { id: 'd5', platform: 'LINKEDIN', accountName: null, status: 'SETUP_REQUIRED' },
  { id: 'd6', platform: 'X', accountName: null, status: 'SETUP_REQUIRED' },
  { id: 'd7', platform: 'CUSTOM_RTMP', accountName: null, status: 'NOT_CONNECTED' }
]

export const mockSchedule: ScheduledItemUI[] = [
  { id: 's1', title: 'Sunday Service — Live', type: 'PRERECORDED_LIVE', scheduledAt: '2026-08-30T13:00:00Z', platforms: ['YOUTUBE', 'FACEBOOK'], status: 'SCHEDULED' },
  { id: 's2', title: 'Worship Highlights Reel', type: 'VIDEO_PUBLISH', scheduledAt: '2026-08-25T16:00:00Z', platforms: ['TIKTOK'], status: 'SCHEDULED' },
  { id: 's3', title: 'Midweek Devotional', type: 'LIVE_STREAM', scheduledAt: '2026-08-27T00:00:00Z', platforms: ['YOUTUBE'], status: 'SCHEDULED' },
  { id: 's4', title: 'Sunday Service — Aug 17', type: 'PRERECORDED_LIVE', scheduledAt: '2026-08-17T13:00:00Z', platforms: ['YOUTUBE', 'FACEBOOK'], status: 'COMPLETED' }
]

export const mockActivity: ActivityItem[] = [
  { id: 'a1', type: 'STREAM', status: 'SUCCESS', message: 'Live stream completed — Sunday Service', platform: 'YOUTUBE', createdAt: '2026-08-23T15:10:00Z' },
  { id: 'a2', type: 'PUBLISH', status: 'SUCCESS', message: 'Behind the Scenes: Studio Rebuild published', platform: 'YOUTUBE', createdAt: '2026-08-19T09:20:00Z' },
  { id: 'a3', type: 'PUBLISH', status: 'WARNING', message: 'Facebook publish failed — page permission missing', platform: 'FACEBOOK', createdAt: '2026-08-19T09:21:00Z' },
  { id: 'a4', type: 'AUTH', status: 'WARNING', message: 'TikTok authorization not yet configured', platform: 'TIKTOK', createdAt: '2026-08-18T12:00:00Z' },
  { id: 'a5', type: 'UPLOAD', status: 'SUCCESS', message: 'Quick Announcement uploaded, processing started', createdAt: '2026-08-21T18:40:00Z' },
  { id: 'a6', type: 'PUBLISH', status: 'ERROR', message: 'Q&A with the Team (raw) failed to process', createdAt: '2026-08-23T20:05:00Z' }
]

export const mockAnalytics = {
  totals: { views: 25_040, likes: 1_870, comments: 412, shares: 96, watchTimeHours: 812 },
  byPlatform: [
    { platform: 'YOUTUBE' as const, views: 12_500, likes: 940, comments: 220, followers: 34 },
    { platform: 'TIKTOK' as const, views: 8_300, likes: 810, comments: 150, followers: 61 },
    { platform: 'FACEBOOK' as const, views: 4_240, likes: 120, comments: 42, followers: 9 }
  ],
  viewsOverTime: [
    { date: 'Aug 10', YOUTUBE: 1800, TIKTOK: 900, FACEBOOK: 500 },
    { date: 'Aug 13', YOUTUBE: 2100, TIKTOK: 1400, FACEBOOK: 600 },
    { date: 'Aug 16', YOUTUBE: 1700, TIKTOK: 2000, FACEBOOK: 480 },
    { date: 'Aug 19', YOUTUBE: 2600, TIKTOK: 1500, FACEBOOK: 900 },
    { date: 'Aug 22', YOUTUBE: 2300, TIKTOK: 1600, FACEBOOK: 760 },
    { date: 'Aug 23', YOUTUBE: 2000, TIKTOK: 900, FACEBOOK: 1000 }
  ]
}

export const mockDashboard = {
  storageUsedBytes: 2_400_000_000 * 1.0,
  storageLimitBytes: 5_368_709_120,
  connectedCount: 2,
  totalPlatforms: 7,
  totalVideos: mockVideos.length,
  activeLiveStream: null as null | { title: string; platforms: string[]; durationSeconds: number }
}
