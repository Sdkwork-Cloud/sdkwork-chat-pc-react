

import type { 
  RTCRoom, 
  RTCToken, 
  CreateRoomRequest, 
  CreateRoomResponse,
  CallRecord 
} from '../entities/rtc.entity';
import { generateUUID, getAppSdkClientWithSession, IS_DEV } from '@sdkwork/openchat-pc-kernel';
import { translate } from "@sdkwork/openchat-pc-i18n";

const MOCK_MODE = IS_DEV;

const RTC_REPO_VERSION = '1.0.6';

function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

async function withRtcFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T | Promise<T>): Promise<T> {
  try {
    return await apiTask();
  } catch (error) {
    if (MOCK_MODE) {
      return fallbackTask();
    }
    throw error;
  }
}

function normalizeRoom(input: Partial<RTCRoom>, request?: CreateRoomRequest): RTCRoom {
  const now = new Date().toISOString();
  const roomId = input.id || generateUUID();
  return {
    id: roomId,
    uuid: input.uuid || roomId,
    name: input.name ?? request?.name,
    type: (input.type as RTCRoom['type']) || request?.type || 'p2p',
    creatorId: input.creatorId || 'current-user',
    participants: Array.isArray(input.participants) ? input.participants : request?.participants || ['current-user'],
    status: (input.status as RTCRoom['status']) || 'active',
    startedAt: input.startedAt || now,
    endedAt: input.endedAt,
  };
}

function normalizeToken(input: Partial<RTCToken>, roomId: string): RTCToken {
  const now = new Date().toISOString();
  return {
    id: input.id || generateUUID(),
    uuid: input.uuid || generateUUID(),
    roomId: input.roomId || roomId,
    userId: input.userId || 'current-user',
    token: input.token || `rtc-token-${Date.now()}`,
    expiresAt: input.expiresAt || new Date(Date.now() + 3600000).toISOString(),
    createdAt: input.createdAt || now,
  };
}

function normalizeCallRecord(input: Partial<CallRecord>, index: number): CallRecord {
  return {
    id: input.id || `${Date.now()}-${index}`,
    callType: (input.callType as CallRecord['callType']) || 'audio',
    direction: (input.direction as CallRecord['direction']) || 'outgoing',
    remoteUserId: input.remoteUserId || 'unknown',
    remoteUserName: input.remoteUserName || 'Unknown',
    remoteUserAvatar: input.remoteUserAvatar,
    status: (input.status as CallRecord['status']) || 'completed',
    duration: input.duration,
    timestamp: input.timestamp || new Date().toISOString(),
  };
}



export async function createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
  return withRtcFallback(
    async () => {
      const response = await getAppSdkClientWithSession().rtc.createRoom(request as any);
      const payload = unwrapData<Record<string, unknown>>(response, {});
      const room = normalizeRoom((payload.room as Partial<RTCRoom>) || (payload as Partial<RTCRoom>), request);
      const token = normalizeToken((payload.token as Partial<RTCToken>) || {}, room.id);
      return { room, token };
    },
    () => {
      const roomId = generateUUID();
      const room = normalizeRoom(
        {
          id: roomId,
          uuid: roomId,
          type: request.type,
          creatorId: 'current-user',
          participants: request.participants,
          status: 'active',
          startedAt: new Date().toISOString(),
        },
        request,
      );
      const token = normalizeToken(
        {
          id: generateUUID(),
          uuid: generateUUID(),
          roomId,
          userId: 'current-user',
          token: `mock-token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        roomId,
      );
      console.log('[RTC] Mock room created:', roomId);
      return { room, token };
    },
  );
}


export async function getRoom(roomId: string): Promise<RTCRoom | null> {
  return withRtcFallback(
    async () => {
      const response = await getAppSdkClientWithSession().rtc.getRoom(roomId);
      const payload = unwrapData<Record<string, unknown> | null>(response, null);
      if (!payload) {
        return null;
      }
      return normalizeRoom(payload as Partial<RTCRoom>);
    },
    () => ({
      id: roomId,
      uuid: roomId,
      type: 'p2p',
      creatorId: 'current-user',
      participants: ['current-user', 'remote-user'],
      status: 'active',
      startedAt: new Date().toISOString(),
    }),
  );
}


export async function endRoom(roomId: string): Promise<boolean> {
  return withRtcFallback(
    async () => {
      await getAppSdkClientWithSession().rtc.endRoom(roomId);
      return true;
    },
    () => {
      console.log('[RTC] Mock room ended:', roomId);
      return true;
    },
  );
}


export async function getToken(roomId: string): Promise<RTCToken> {
  return withRtcFallback(
    async () => {
      const response = await getAppSdkClientWithSession().rtc.createRoomToken(roomId);
      const payload = unwrapData<Record<string, unknown>>(response, {});
      return normalizeToken(payload as Partial<RTCToken>, roomId);
    },
    () =>
      normalizeToken(
        {
          id: generateUUID(),
          uuid: generateUUID(),
          roomId,
          userId: 'current-user',
          token: `mock-token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        roomId,
      ),
  );
}


export async function getCallRecords(): Promise<CallRecord[]> {
  return withRtcFallback(
    async () => {
      const response = await getAppSdkClientWithSession().rtc.listRecords({ page: 1, size: 50 });
      const payload = unwrapData<unknown[]>(response, []);
      const list = Array.isArray(payload) ? payload : [];
      return list.map((item, index) => normalizeCallRecord(item as Partial<CallRecord>, index));
    },
    () => [
      {
        id: '1',
        callType: 'audio',
        direction: 'outgoing',
        remoteUserId: 'user1',
        remoteUserName: '?????????',
        status: 'completed',
        duration: 120,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        callType: 'video',
        direction: 'incoming',
        remoteUserId: 'user2',
        remoteUserName: '?????????',
        status: 'missed',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  );
}


export async function checkMediaDevices(): Promise<{ video: boolean; audio: boolean }> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    
    return {
      video: videoDevices.length > 0,
      audio: audioDevices.length > 0,
    };
  } catch (error) {
    console.error('[RTC] Failed to enumerate devices:', error);
    return { video: false, audio: false };
  }
}


async function getLocalStreamWithFallback(
  video: boolean = true, 
  audio: boolean = true
): Promise<{ stream: MediaStream | null; hasVideo: boolean; hasAudio: boolean; error?: string }> {
  const deviceAvailability = await checkMediaDevices();
  
  const requestVideo = video && deviceAvailability.video;
  const requestAudio = audio && deviceAvailability.audio;
  
  if (!requestVideo && !requestAudio) {
    return {
      stream: null,
      hasVideo: false,
      hasAudio: false,
      error: 'No camera or microphone device detected',
    };
  }

  try {
    const constraints: MediaStreamConstraints = {
      video: requestVideo ? { width: 1280, height: 720 } : false,
      audio: requestAudio,
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    return {
      stream,
      hasVideo: requestVideo && stream.getVideoTracks().length > 0,
      hasAudio: requestAudio && stream.getAudioTracks().length > 0,
    };
  } catch (error) {
    
    const isVideoError = error instanceof DOMException && 
      (error.name === 'NotFoundError' || error.name === 'NotReadableError' || error.name === 'OverconstrainedError');
    
    if (isVideoError && requestVideo) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        return {
          stream: audioStream,
          hasVideo: false,
          hasAudio: true,
        };
      } catch (audioError) {
      }
    }
    
    let errorMessage = translate('Unable to access media devices.');
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          errorMessage = translate('No camera or microphone device was found.');
          break;
        case 'NotAllowedError':
          errorMessage = translate('Please allow camera and microphone permissions.');
          break;
        case 'NotReadableError':
          errorMessage = translate('The device is busy or could not be started.');
          break;
        case 'OverconstrainedError':
          errorMessage = translate('Requested resolution is not supported by the device.');
          break;
      }
    }
    
    return { 
      stream: null, 
      hasVideo: false, 
      hasAudio: false,
      error: errorMessage
    };
  }
}


export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  private hasVideo: boolean = false;
  private hasAudio: boolean = false;

  constructor(
    config?: RTCConfiguration,
    callbacks?: {
      onIceCandidate?: (candidate: RTCIceCandidate) => void;
      onRemoteStream?: (stream: MediaStream) => void;
      onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    }
  ) {
    this.pc = new RTCPeerConnection(config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.onIceCandidate = callbacks?.onIceCandidate || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.onConnectionStateChange = callbacks?.onConnectionStateChange || null;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.pc) return;

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange && this.pc) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };
  }

  
  async getLocalStream(
    video: boolean = true, 
    audio: boolean = true
  ): Promise<{ stream: MediaStream | null; error?: string }> {
    const result = await getLocalStreamWithFallback(video, audio);
    
    this.localStream = result.stream;
    this.hasVideo = result.hasVideo;
    this.hasAudio = result.hasAudio;
    
    return {
      stream: this.localStream,
      error: result.error,
    };
  }

  
  addLocalStream() {
    if (!this.pc || !this.localStream) return;

    this.localStream.getTracks().forEach((track) => {
      if (this.localStream && this.pc) {
        this.pc.addTrack(track, this.localStream);
      }
    });
  }

  
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  
  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  
  close() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());

    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }

  
  getLocalStreamInstance(): MediaStream | null {
    return this.localStream;
  }

  
  getRemoteStreamInstance(): MediaStream | null {
    return this.remoteStream;
  }

  
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState || null;
  }

  
  hasVideoDevice(): boolean {
    return this.hasVideo;
  }

  
  hasAudioDevice(): boolean {
    return this.hasAudio;
  }
}
