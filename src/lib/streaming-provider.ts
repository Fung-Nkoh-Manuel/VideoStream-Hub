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
  private baseUrl: string

  constructor(private apiKey: string, baseUrl?: string) {
    const rawUrl = baseUrl || process.env.STREAM_PROVIDER_API_URL || 'https://livepeer.studio/api'
    this.baseUrl = rawUrl.replace(/\/+$/, '')
  }

  private async request(path: string, init?: RequestInit) {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`
    const res = await fetch(url, {
      ...init,
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
    return res.json()
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
    const stream = await this.request(`/stream/${streamId}`)
    const existingTargets = stream?.multistream?.targets || []

    await this.request(`/stream/${streamId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        multistream: {
          targets: [...existingTargets, { id: targetId, profile: 'source' }]
        }
      })
    })
  }

  async removeDestination(streamId: string, destinationId: string): Promise<void> {
    const stream = await this.request(`/stream/${streamId}`)
    const targets: Array<{ id: string; profile?: string; name?: string }> = stream?.multistream?.targets || []

    const targetToRemove = targets.find((t) => t.id === destinationId || t.name === destinationId)
    const updatedTargets = targets.filter((t) => t.id !== destinationId && t.name !== destinationId)

    await this.request(`/stream/${streamId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        multistream: {
          targets: updatedTargets
        }
      })
    })

    if (targetToRemove?.id) {
      try {
        await this.request(`/multistream/target/${targetToRemove.id}`, { method: 'DELETE' })
      } catch {}
    }
  }

  async startStream(streamId: string): Promise<void> {
    await this.request(`/stream/${streamId}`, {
      method: 'PATCH',
      body: JSON.stringify({ suspended: false })
    })
  }

  async stopStream(streamId: string): Promise<void> {
    try {
      await this.request(`/stream/${streamId}`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended: true })
      })
    } catch {}

    try {
      await this.request(`/stream/${streamId}/terminate`, { method: 'POST' })
    } catch {}
  }

  async getStatus(streamId: string): Promise<ProviderStreamStatus> {
    const stream = await this.request(`/stream/${streamId}`)

    let status: 'idle' | 'starting' | 'live' | 'stopping' | 'ended' | 'error' = 'idle'
    if (stream?.isActive) {
      status = 'live'
    } else if (stream?.suspended) {
      status = 'ended'
    }

    let health: StreamHealth = 'unknown'
    if (stream?.health) {
      if (typeof stream.health === 'string' && ['excellent', 'fair', 'poor', 'unknown'].includes(stream.health)) {
        health = stream.health as StreamHealth
      } else if (typeof stream.health === 'object' && stream.health.status) {
        const s = String(stream.health.status).toLowerCase()
        if (['healthy', 'good', 'excellent'].includes(s)) health = 'excellent'
        else if (s === 'fair') health = 'fair'
        else if (['unhealthy', 'poor', 'bad'].includes(s)) health = 'poor'
      }
    }

    const destinations = (stream?.multistream?.targets || []).map((t: any) => {
      let destStatus: 'pending' | 'live' | 'stopped' | 'error' = 'pending'
      if (t.status?.phase === 'online' || t.status?.phase === 'ready') destStatus = 'live'
      else if (t.status?.phase === 'failed') destStatus = 'error'
      else if (!stream?.isActive) destStatus = 'stopped'

      return {
        destinationId: t.name || t.id,
        status: destStatus,
        errorMessage: t.status?.errorMessage
      }
    })

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

export function getStreamingProvider(): StreamingProvider {
  const apiKey = process.env.STREAM_PROVIDER_API_KEY
  if (apiKey) return new LivepeerStreamingProvider(apiKey)
  return new UnconfiguredStreamingProvider()
}

export function isStreamingConfigured(): boolean {
  return Boolean(process.env.STREAM_PROVIDER_API_KEY)
}
