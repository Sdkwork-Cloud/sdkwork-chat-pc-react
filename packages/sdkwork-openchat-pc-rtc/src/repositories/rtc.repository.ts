

import type { 
  RTCRoom, 
  RTCToken, 
  CreateRoomRequest, 
  CreateRoomResponse,
  CallRecord 
} from '../entities/rtc.entity';
import { generateUUID, getPcImSdkClient, getPcImSessionIdentity } from '@sdkwork/openchat-pc-kernel';
import { translate } from "@sdkwork/openchat-pc-i18n";

const RTC_REPO_VERSION = '1.0.7';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function getCurrentRtcUserId(): string {
  return getPcImSessionIdentity()?.userId || 'current-user';
}

function getRtcBackendApi() {
  return getPcImSdkClient().rtc;
}

function normalizeParticipants(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const participants = value.filter((item): item is string => typeof item === 'string' && item.trim());
  return participants.length > 0 ? participants : fallback;
}

function resolveRoomStatus(value: unknown): RTCRoom['status'] {
  return pickString(value)?.toLowerCase() === 'ended' ? 'ended' : 'active';
}

function resolveRoomType(value: unknown, fallback: RTCRoom['type'] = 'p2p'): RTCRoom['type'] {
  return pickString(value)?.toLowerCase() === 'group' ? 'group' : fallback;
}

function resolveCallDirection(room: Record<string, unknown>, currentUserId: string): CallRecord['direction'] {
  return pickString(room.creatorId) === currentUserId ? 'outgoing' : 'incoming';
}

function resolveCallStatus(room: Record<string, unknown>): CallRecord['status'] {
  return resolveRoomStatus(room.status) === 'ended' ? 'completed' : 'missed';
}

function resolveCallDuration(room: Record<string, unknown>): number | undefined {
  const startedAt = pickString(room.startedAt);
  const endedAt = pickString(room.endedAt);
  if (!startedAt || !endedAt) {
    return undefined;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return undefined;
  }

  return Math.round((end - start) / 1000);
}

function normalizeCallRecordFromRoom(room: Record<string, unknown>, index: number): CallRecord {
  const currentUserId = getCurrentRtcUserId();
  const participants = normalizeParticipants(room.participants, [currentUserId]);
  const remoteUserId = participants.find((participant) => participant !== currentUserId) || 'unknown';
  const fallbackName = remoteUserId === 'unknown' ? 'Unknown' : remoteUserId;

  return normalizeCallRecord(
    {
      id: pickString(room.id, room.uuid) || `${Date.now()}-${index}`,
      callType: resolveRoomType(room.type) === 'group' ? 'video' : 'audio',
      direction: resolveCallDirection(room, currentUserId),
      remoteUserId,
      remoteUserName: pickString(room.remoteUserName, room.name) || fallbackName,
      remoteUserAvatar: pickString(room.remoteUserAvatar),
      status: resolveCallStatus(room),
      duration: resolveCallDuration(room),
      timestamp: pickString(room.endedAt, room.startedAt, room.createdAt) || new Date().toISOString(),
    },
    index,
  );
}

function normalizeRoom(input: Partial<RTCRoom>, request?: CreateRoomRequest): RTCRoom {
  const now = new Date().toISOString();
  const roomId = pickString(input.id, input.uuid) || generateUUID();
  const participants = normalizeParticipants(input.participants, request?.participants || [getCurrentRtcUserId()]);
  return {
    id: roomId,
    uuid: input.uuid || roomId,
    name: input.name ?? request?.name,
    type: resolveRoomType(input.type, request?.type || 'p2p'),
    creatorId: pickString(input.creatorId) || getCurrentRtcUserId(),
    participants,
    status: resolveRoomStatus(input.status),
    startedAt: pickString(input.startedAt) || now,
    endedAt: input.endedAt,
  };
}

function normalizeToken(input: Partial<RTCToken>, roomId: string): RTCToken {
  const now = new Date().toISOString();
  const currentUserId = getCurrentRtcUserId();
  return {
    id: input.id || generateUUID(),
    uuid: input.uuid || generateUUID(),
    roomId: input.roomId || roomId,
    userId: input.userId || currentUserId,
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
  const rtcApi = getRtcBackendApi();
  const roomResponse = await rtcApi.appControllerCreateRoom(request as any);
  const roomPayload = unwrapData<unknown>(roomResponse, {});
  const room = normalizeRoom(
    isRecord(roomPayload) ? (roomPayload as Partial<RTCRoom>) : {},
    request,
  );

  const tokenResponse = await rtcApi.appControllerGenerateToken({
    roomId: room.id,
    userId: getCurrentRtcUserId(),
  });
  const tokenPayload = unwrapData<unknown>(tokenResponse, {});
  const token = normalizeToken(
    isRecord(tokenPayload) ? (tokenPayload as Partial<RTCToken>) : {},
    room.id,
  );

  return { room, token };
}


export async function getRoom(roomId: string): Promise<RTCRoom | null> {
  const response = await getRtcBackendApi().appControllerGetRoomById(roomId);
  const payload = unwrapData<unknown>(response, null);
  if (!isRecord(payload)) {
    return null;
  }
  return normalizeRoom(payload as Partial<RTCRoom>);
}


export async function endRoom(roomId: string): Promise<boolean> {
  await getRtcBackendApi().appControllerEndRoom(roomId);
  return true;
}


export async function getToken(roomId: string): Promise<RTCToken> {
  const response = await getRtcBackendApi().appControllerGenerateToken({
    roomId,
    userId: getCurrentRtcUserId(),
  });
  const payload = unwrapData<unknown>(response, {});
  return normalizeToken(isRecord(payload) ? (payload as Partial<RTCToken>) : {}, roomId);
}


export async function getCallRecords(): Promise<CallRecord[]> {
  const currentUserId = getCurrentRtcUserId();
  const response = await getRtcBackendApi().appControllerGetRoomsByUserId(currentUserId);
  const payload = unwrapData<unknown[]>(response, []);
  const rooms = Array.isArray(payload) ? payload.filter(isRecord) : [];
  return rooms.map((room, index) => normalizeCallRecordFromRoom(room, index));
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
