// Vendor-agnostic streaming relay abstraction.
//
// Live Studio never talks to a specific vendor's SDK directly. Everything
// goes through this interface so the underlying relay (an API-driven RTMP
// multistreaming service) can be swapped without touching UI or route code.
//
// To go live for real: implement `RealStreamingProvider` against your
// chosen relay vendor's REST API and set STREAM_PROVIDER_API_KEY /
// STREAM_PROVIDER_API_URL in .env. Until those are set, the app runs on
// `UnconfiguredStreamingProvider`, which returns an honest
// "Setup Required" error instead of pretending to go live.

export type StreamHealth = 'excellent' | 'fair' | 'poor' | 'unknown'

export interface ProviderDestination {
  id: string
  platform: string
  rtmpUrl: string
  streamKey: string
}

export interface ProviderStreamStatus {
  streamId: string
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'ended' | 'error'
  health: StreamHealth
  destinations: Array<{
    destinationId: string
    status: 'pending' | 'live' | 'stopped' | 'error'
    viewerCount?: number
    errorMessage?: string
  }>
}

export interface StreamingProvider {
  createStream(input: { title: string; ingestPreset?: string }): Promise<{ streamId: string; rtmpIngestUrl: string; streamKey: string }>
  addDestination(streamId: string, destination: ProviderDestination): Promise<void>
  removeDestination(streamId: string, destinationId: string): Promise<void>
  startStream(streamId: string): Promise<void>
  stopStream(streamId: string): Promise<void>
  getStatus(streamId: string): Promise<ProviderStreamStatus>
  getHealth(streamId: string): Promise<StreamHealth>
}

class UnconfiguredStreamingProvider implements StreamingProvider {
  private fail(): never {
    throw new StreamingProviderError(
      'Streaming service is not configured. Add STREAM_PROVIDER_API_KEY and STREAM_PROVIDER_API_URL to .env to enable live multistreaming.'
    )
  }
  async createStream(): Promise<{ streamId: string; rtmpIngestUrl: string; streamKey: string }> { this.fail() }
  async addDestination(): Promise<void> { this.fail() }
  async removeDestination(): Promise<void> { this.fail() }
  async startStream(): Promise<void> { this.fail() }
  async stopStream(): Promise<void> { this.fail() }
  async getStatus(): Promise<ProviderStreamStatus> { this.fail() }
  async getHealth(): Promise<StreamHealth> { this.fail() }
}

export class StreamingProviderError extends Error {}

// Skeleton for a real implementation — fill in once a relay vendor is
// chosen. Every method maps 1:1 to a typical multistream relay REST API.
class RealStreamingProvider implements StreamingProvider {
  constructor(private apiKey: string, private baseUrl: string) {}

  private async request(path: string, init?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
    })
    if (!res.ok) throw new StreamingProviderError(`Streaming provider error: ${res.status} ${res.statusText}`)
    return res.json()
  }

  async createStream(input: { title: string; ingestPreset?: string }) {
    return this.request('/streams', { method: 'POST', body: JSON.stringify(input) })
  }
  async addDestination(streamId: string, destination: ProviderDestination) {
    await this.request(`/streams/${streamId}/destinations`, { method: 'POST', body: JSON.stringify(destination) })
  }
  async removeDestination(streamId: string, destinationId: string) {
    await this.request(`/streams/${streamId}/destinations/${destinationId}`, { method: 'DELETE' })
  }
  async startStream(streamId: string) {
    await this.request(`/streams/${streamId}/start`, { method: 'POST' })
  }
  async stopStream(streamId: string) {
    await this.request(`/streams/${streamId}/stop`, { method: 'POST' })
  }
  async getStatus(streamId: string): Promise<ProviderStreamStatus> {
    return this.request(`/streams/${streamId}/status`)
  }
  async getHealth(streamId: string): Promise<StreamHealth> {
    const status = await this.getStatus(streamId)
    return status.health
  }
}

export function getStreamingProvider(): StreamingProvider {
  const apiKey = process.env.STREAM_PROVIDER_API_KEY
  const baseUrl = process.env.STREAM_PROVIDER_API_URL
  if (apiKey && baseUrl) return new RealStreamingProvider(apiKey, baseUrl)
  return new UnconfiguredStreamingProvider()
}

export function isStreamingConfigured(): boolean {
  return Boolean(process.env.STREAM_PROVIDER_API_KEY && process.env.STREAM_PROVIDER_API_URL)
}
