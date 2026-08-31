// WebRTC WHIP (WebRTC HTTP Ingestion Protocol) helper for browser-based live streaming directly to Livepeer.
// Uses server-side API proxy route (/api/live/whip) to eliminate browser CORS errors and keep API keys secure.

export async function startWhipStream(
  mediaStream: MediaStream,
  streamKey: string,
  providerStreamId?: string
): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })

  // Add video and audio tracks from browser camera/mic/screenshare
  mediaStream.getTracks().forEach((track) => {
    pc.addTrack(track, mediaStream)
  })

  // Create WebRTC SDP offer
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  // Use server-side proxy endpoint to bypass CORS and include Livepeer bearer authorization
  let proxyUrl = `/api/live/whip?streamKey=${encodeURIComponent(streamKey)}`
  if (providerStreamId) {
    proxyUrl += `&providerStreamId=${encodeURIComponent(providerStreamId)}`
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  })

  if (!res.ok) {
    let errText = res.statusText
    try {
      const json = await res.json()
      if (json.error) errText = json.error
    } catch {}
    throw new Error(`Browser Live Stream connection failed (${res.status}): ${errText}`)
  }

  const answerSdp = await res.text()
  await pc.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp
  })

  return pc
}

export function stopWhipStream(pc: RTCPeerConnection | null, mediaStream: MediaStream | null) {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {}
    })
  }
  if (pc) {
    try {
      pc.close()
    } catch {}
  }
}
