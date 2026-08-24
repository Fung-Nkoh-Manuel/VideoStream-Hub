// Livepeer Studio Streaming Provider implementation.
//
// Live Studio never talks to a specific vendor's SDK directly. Everything
// goes through this interface using STREAM_PROVIDER_API_KEY and STREAM_PROVIDER_API_URL.

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

export class StreamingProviderError extends Error {}

class UnconfiguredStreamingProvider implements StreamingProvider {
  private fail(): never {
    throw new StreamingProviderError(
      'Streaming service is not configured. Add STREAM_PROVIDER_API_KEY to .env to enable live multistreaming.'
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

class LivepeerStreamingProvider implements StreamingProvider {
  private baseUrls: string[]

  constructor(private apiKey: string, baseUrl?: string) {
    const customUrl = baseUrl || process.env.STREAM_PROVIDER_API_URL
    if (customUrl && customUrl.trim() !== '') {
      this.baseUrls = [customUrl.replace(/\/+$/, '')]
    } else {
      this.baseUrls = ['https://livepeer.studio/api', 'https://livepeer.com/api']
    }
  }

  private async request(path: string, init?: RequestInit) {
    const formattedPath = path.startsWith('/') ? path : '/' + path
    let lastError: Error | null = null

    for (const base of this.baseUrls) {
      const url = `${base}${formattedPath}`
      try {
        const res = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(12000),
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...(init?.headers ?? {})
          }
        })

        if (!res.ok) {
          let errText = res.statusText
          try {
            const errJson = await res.json()
            if (Array.isArray(errJson?.errors) && errJson.errors[0]) {
              errText = errJson.errors[0]
            } else if (errJson?.message) {
              errText = errJson.message
            }
          } catch {}
          throw new StreamingProviderError(`Livepeer API error (${res.status}): ${errText}`)
        }

        if (res.status === 204) return null
        return await res.json()
      } catch (err: any) {
        lastError = err
        if (err instanceof StreamingProviderError) {
          throw err
        }
      }
    }

    throw new StreamingProviderError(
      `Could not connect to Livepeer API (Network timeout or server unreachable). Details: ${lastError?.message || 'Connection failed'}`
    )
  }

  async createStream(input: { title: string; ingestPreset?: string }): Promise<{ streamId: string; rtmpIngestUrl: string; streamKey: string }> {
    const data = await this.request('/stream', {
      method: 'POST',
      body: JSON.stringify({
        name: input.title,
        ...(input.ingestPreset ? { preset: input.ingestPreset } : {})
      })
    })

    const streamId: string = data.id
    const streamKey: string = data.streamKey
    const rtmpIngestUrl: string = data.rtmpIngestUrl || data.ingestUrl || 'rtmp://rtmp.livepeer.studio/live'

    return { streamId, rtmpIngestUrl, streamKey }
  }

  async addDestination(streamId: string, destination: ProviderDestination): Promise<void> {
    let targetUrl = destination.rtmpUrl
    if (destination.streamKey) {
      targetUrl = targetUrl.endsWith('/') ? `${targetUrl}${destination.streamKey}` : `${targetUrl}/${destination.streamKey}`
    }

    const targetData = await this.request('/multistream/target', {
      method: 'POST',
      body: JSON.stringify({
        name: destination.id,
        url: targetUrl
      })
    })

    const targetId = targetData.id
    await this.request(`/stream/${streamId}/multistream/target/${targetId}`, {
      method: 'POST'
    })
  }

  async removeDestination(streamId: string, destinationId: string): Promise<void> {
    await this.request(`/stream/${streamId}/multistream/target/${destinationId}`, {
      method: 'DELETE'
    })
  }

  async startStream(streamId: string): Promise<void> {
    await this.request(`/stream/${streamId}`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended: false })
    })
  }

  async stopStream(streamId: string): Promise<void> {
    await this.request(`/stream/${streamId}`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended: true })
    })
  }

  async getStatus(streamId: string): Promise<ProviderStreamStatus> {
    const data = await this.request(`/stream/${streamId}`)

    const isActive = Boolean(data.isActive)
    const isSuspended = Boolean(data.suspended)
    const status: ProviderStreamStatus['status'] = isActive
      ? 'live'
      : isSuspended
      ? 'ended'
      : 'idle'

    let health: StreamHealth = 'unknown'
    if (data.health) {
      if (data.health.healthy) health = 'excellent'
      else if (data.health.issues?.length > 0) health = 'fair'
      else health = 'poor'
    }

    const destinations: ProviderStreamStatus['destinations'] = (data.multistream?.targets || []).map((t: any) => ({
      destinationId: t.id,
      status: t.active ? 'live' : 'stopped'
    }))

    return {
      streamId,
      status,
      health,
      destinations
    }
  }

  async getHealth(streamId: string): Promise<StreamHealth> {
    try {
      const status = await this.getStatus(streamId)
      return status.health
    } catch {
      return 'unknown'
    }
  }
}

export function isStreamingConfigured(): boolean {
  const key = process.env.STREAM_PROVIDER_API_KEY
  return Boolean(key && key.trim().length > 0)
}

export function getStreamingProvider(): StreamingProvider {
  const apiKey = process.env.STREAM_PROVIDER_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    return new UnconfiguredStreamingProvider()
  }
  return new LivepeerStreamingProvider(apiKey.trim())
}
