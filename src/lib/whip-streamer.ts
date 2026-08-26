// WebRTC WHIP (WebRTC HTTP Ingestion Protocol) helper for browser-based live streaming directly to Livepeer.

export async function startWhipStream(
  mediaStream: MediaStream,
  streamKey: string
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

  // Livepeer WHIP WebRTC ingest endpoint
  const whipUrl = `https://livepeer.studio/api/whip/${encodeURIComponent(streamKey)}`
  const res = await fetch(whipUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Browser Live Stream connection failed (${res.status}): ${errText || res.statusText}`)
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
