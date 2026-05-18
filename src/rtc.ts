import { api } from './api';
import { on, off, send } from './socket';

export interface CallCallbacks {
  onConnected: () => void;
  onEnded: (reason: string) => void;
  onAudioLevel: (level: number) => void;
}

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let levelTimer: number | undefined;

const STATIC_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80',                 username: 'c40ac051f966a4ccfd724770', credential: 'PjKEkcJ7HOgdX6Nx' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp',   username: 'c40ac051f966a4ccfd724770', credential: 'PjKEkcJ7HOgdX6Nx' },
  { urls: 'turn:global.relay.metered.ca:443',                username: 'c40ac051f966a4ccfd724770', credential: 'PjKEkcJ7HOgdX6Nx' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'c40ac051f966a4ccfd724770', credential: 'PjKEkcJ7HOgdX6Nx' },
];

export async function startCall(roomId: string, isInitiator: boolean, callbacks: CallCallbacks): Promise<void> {
  let iceServers: RTCIceServer[] = [];
  try {
    const servers = await api.calls.iceConfig();
    if (Array.isArray(servers) && servers.length > 0) {
      iceServers = servers;
      console.info('[RTC] ICE servers loaded:', servers.length, 'entries');
    } else {
      throw new Error('Empty ICE config from backend');
    }
  } catch (e) {
    console.warn('[RTC] Backend ICE config failed, using static fallback:', e);
    iceServers = STATIC_ICE_SERVERS;
  }

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    },
    video: false,
  });

  pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
  localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream!));

  audioCtx = new AudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const source = audioCtx.createMediaStreamSource(localStream);
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  levelTimer = window.setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    callbacks.onAudioLevel(avg / 255);
  }, 100);

  pc.ontrack = (event) => {
    remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    void remoteAudio.play();
    callbacks.onConnected();
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) send('ice', { candidate: event.candidate, roomId });
  };

  const unsubOffer = on('sdp:offer', async (payload) => {
    const { sdp } = payload as { sdp: RTCSessionDescriptionInit };
    await pc!.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc!.createAnswer();
    await pc!.setLocalDescription(answer);
    send('sdp:answer', { sdp: answer, roomId });
  });

  const unsubAnswer = on('sdp:answer', async (payload) => {
    const { sdp } = payload as { sdp: RTCSessionDescriptionInit };
    await pc!.setRemoteDescription(new RTCSessionDescription(sdp));
  });

  const unsubIce = on('ice', async (payload) => {
    const { candidate } = payload as { candidate: RTCIceCandidateInit };
    await pc!.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  });

  const unsubEnded = on('call:ended', (payload) => {
    const { reason } = (payload ?? {}) as { reason?: string };
    unsubOffer();
    unsubAnswer();
    unsubIce();
    unsubEnded();
    callbacks.onEnded(reason ?? 'system');
  });

  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send('sdp:offer', { sdp: offer, roomId });
  }
}

export function endCall(): void {
  window.clearInterval(levelTimer);
  localStream?.getTracks().forEach((t) => t.stop());
  pc?.close();
  if (audioCtx) void audioCtx.close();
  if (remoteAudio) { remoteAudio.srcObject = null; remoteAudio = null; }

  pc = null;
  localStream = null;
  audioCtx = null;
  levelTimer = undefined;

  off('sdp:offer');
  off('sdp:answer');
  off('ice');
  off('call:ended');
}

export function toggleMute(muted: boolean): void {
  localStream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
}
