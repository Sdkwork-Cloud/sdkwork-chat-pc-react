

import type {
  CallSession,
  CallType,
  CallSignal,
} from '../entities/rtc.entity';
import { generateUUID, getPcImSdk, getPcImSessionIdentity } from '@sdkwork/openchat-pc-kernel';
import {
  createRTCSDK,
  RTCConfig,
  DEFAULT_RTC_CONFIG,
  DeviceType,
  DeviceInfo,
} from './sdk-adapter';

const CURRENT_USER_ID = 'current-user';

const RTC_SERVICE_VERSION = '1.0.9';

type SupportedRtcProvider = RTCConfig['provider'];

interface ResolvedRtcConnection {
  businessRoomId: string;
  mediaRoomId: string;
  token: string;
  rtcConfig: RTCConfig;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function unwrapRtcValue<T = unknown>(value: unknown): T {
  const record = asRecord(value);
  if (!record) {
    return value as T;
  }
  if (Object.prototype.hasOwnProperty.call(record, 'data')) {
    return unwrapRtcValue<T>(record.data);
  }
  return value as T;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeRtcProvider(value: unknown, fallback: SupportedRtcProvider): SupportedRtcProvider {
  const provider = pickString(value)?.toLowerCase();
  switch (provider) {
    case undefined:
      return fallback;
    case 'volcengine':
      return 'volcengine';
    case 'tencent':
    case 'tencentcloud':
      return 'tencentcloud';
    case 'webrtc':
      return 'webrtc';
    case 'alibaba':
    case 'livekit':
      throw new Error(`RTC provider "${provider}" is not supported by the desktop media adapter`);
    default:
      return fallback;
  }
}

function resolveRemoteMediaStream(payload: unknown): MediaStream | null {
  if (!payload) {
    return null;
  }

  if (typeof MediaStream !== 'undefined' && payload instanceof MediaStream) {
    return payload;
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const direct = record.mediaStream;
  if (direct && typeof direct === 'object') {
    return direct as MediaStream;
  }

  const nestedStream = asRecord(record.stream);
  if (nestedStream?.mediaStream && typeof nestedStream.mediaStream === 'object') {
    return nestedStream.mediaStream as MediaStream;
  }

  if ('id' in record || typeof (payload as MediaStream).getTracks === 'function') {
    return payload as MediaStream;
  }

  return null;
}




export class RTCService {
  private session: CallSession | null = null;
  private rtcSdk: any = null;
  private rtcConfig: RTCConfig = DEFAULT_RTC_CONFIG;
  private activeMediaRoomId: string | null = null;
  private onSessionChange: ((session: CallSession | null) => void) | null = null;
  private onLocalStream: ((stream: MediaStream) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private signalHandler: ((signal: CallSignal) => void) | null = null;

  public updateCallbacks(callbacks?: {
    onSessionChange?: (session: CallSession | null) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onSignal?: (signal: CallSignal) => void;
  }) {
    this.onSessionChange = callbacks?.onSessionChange || null;
    this.onLocalStream = callbacks?.onLocalStream || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.signalHandler = callbacks?.onSignal || null;
  }

  public async dispose(): Promise<void> {
    await this.releaseRtcResources();
    this.session = null;
    this.onSessionChange = null;
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.signalHandler = null;
  }

  private getCurrentUserId(): string {
    return getPcImSessionIdentity()?.userId || CURRENT_USER_ID;
  }

  private getRtcModule() {
    return getPcImSdk().rtc;
  }

  private bindRtcSdkEvents(): void {
    if (!this.rtcSdk) {
      return;
    }

    this.rtcSdk.on('stream-added', (event: any) => {
      console.log('[RTC] Stream added:', event);
      const mediaStream = resolveRemoteMediaStream(event);
      if (mediaStream) {
        this.onRemoteStream?.(mediaStream);
      }
    });

    this.rtcSdk.on('stream-updated', (event: any) => {
      console.log('[RTC] Stream updated:', event);
      const mediaStream = resolveRemoteMediaStream(event);
      if (mediaStream) {
        this.onRemoteStream?.(mediaStream);
      }
    });

    this.rtcSdk.on('stream-removed', (event: any) => {
      console.log('[RTC] Stream removed:', event);
    });

    this.rtcSdk.on('room-state-changed', (event: any) => {
      console.log('[RTC] Room state changed:', event);
    });
  }

  private async ensureRtcSdk(config: RTCConfig): Promise<void> {
    const nextConfig: RTCConfig = {
      ...this.rtcConfig,
      ...config,
    };
    const shouldRecreate =
      !this.rtcSdk
      || this.rtcConfig.provider !== nextConfig.provider
      || this.rtcConfig.appId !== nextConfig.appId
      || this.rtcConfig.serverUrl !== nextConfig.serverUrl;

    this.rtcConfig = nextConfig;

    if (!shouldRecreate) {
      return;
    }

    if (this.rtcSdk?.destroy) {
      await this.rtcSdk.destroy();
      this.activeMediaRoomId = null;
    }

    this.rtcSdk = createRTCSDK(this.rtcConfig);
    await this.rtcSdk.init(this.rtcConfig);
    this.bindRtcSdkEvents();
  }

  private normalizeRoomPayload(payload: unknown, participants: string[]): { id: string } {
    const record = asRecord(unwrapRtcValue<Record<string, unknown>>(payload)) || {};
    const room = asRecord(record.room) || record;
    return {
      id: pickString(room.id, room.businessRoomId, room.providerRoomId, room.roomId) || generateUUID(),
    };
  }

  private resolveRtcConnection(payload: unknown, businessRoomId: string): ResolvedRtcConnection {
    const record = asRecord(unwrapRtcValue<Record<string, unknown>>(payload)) || {};
    const providerConfig = asRecord(record.providerConfig) || {};
    const rtcToken = asRecord(record.rtcToken) || {};
    const token =
      pickString(
        providerConfig.token,
        rtcToken.token,
        rtcToken.value,
        record.token,
      ) || '';

    const resolvedBusinessRoomId =
      pickString(
        providerConfig.businessRoomId,
        asRecord(record.room)?.id,
        asRecord(record.room)?.businessRoomId,
        businessRoomId,
      ) || businessRoomId;
    const mediaRoomId =
      pickString(
        providerConfig.providerRoomId,
        asRecord(record.room)?.providerRoomId,
        resolvedBusinessRoomId,
      ) || resolvedBusinessRoomId;
    const provider = normalizeRtcProvider(providerConfig.provider, this.rtcConfig.provider);
    const appId = pickString(providerConfig.appId) || this.rtcConfig.appId;
    const serverUrl = pickString(providerConfig.endpoint, this.rtcConfig.serverUrl);

    if (!token) {
      throw new Error('RTC join token is unavailable');
    }

    return {
      businessRoomId: resolvedBusinessRoomId,
      mediaRoomId,
      token,
      rtcConfig: {
        ...this.rtcConfig,
        provider,
        appId,
        token,
        ...(serverUrl ? { serverUrl } : {}),
      },
    };
  }

  private async createSdkRoom(calleeId: string): Promise<{ id: string }> {
    const currentUserId = this.getCurrentUserId();
    const payload = await this.getRtcModule().rooms.create({
      type: 'p2p',
      participants: [currentUserId, calleeId],
    });
    return this.normalizeRoomPayload(payload, [currentUserId, calleeId]);
  }

  private async prepareRtcConnection(
    roomId: string,
    remoteUserId: string,
  ): Promise<ResolvedRtcConnection> {
    const payload = await this.getRtcModule().connection.prepareCall(roomId, {
      channelId: remoteUserId,
      includeRealtimeToken: true,
    });
    return this.resolveRtcConnection(payload, roomId);
  }

  private async sendRtcSignal(
    eventName: string,
    signalType: CallSignal['type'],
    toUserId: string,
    roomId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const signal: CallSignal = {
      type: signalType,
      callId: this.session?.id || generateUUID(),
      from: this.getCurrentUserId(),
      to: toUserId,
      ...(payload ? { payload } : {}),
      timestamp: new Date().toISOString(),
    };

    await this.getRtcModule().signaling.sendCustom(eventName, {
      roomId,
      toUserId,
      payload: {
        callId: signal.callId,
        ...(payload || {}),
      },
    });

    this.signalHandler?.(signal);
  }

  constructor(callbacks?: {
    onSessionChange?: (session: CallSession | null) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onSignal?: (signal: CallSignal) => void;
  }, config?: RTCConfig) {
    this.updateCallbacks(callbacks);
    this.rtcConfig = config || DEFAULT_RTC_CONFIG;
    this.initRTCSDK();
  }


  private async initRTCSDK() {
    try {
      await this.ensureRtcSdk(this.rtcConfig);
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC SDK:', error);
    }
  }


  async initiateCall(
    calleeId: string,
    calleeName: string,
    calleeAvatar: string,
    callType: CallType
  ): Promise<boolean> {
    try {
      const currentUserId = this.getCurrentUserId();
      console.log('[RTC] Initiating call to:', calleeId, 'type:', callType);

      const session: CallSession = {
        id: this.generateCallId(),
        callType,
        status: 'calling',
        direction: 'outgoing',
        localUserId: currentUserId,
        remoteUserId: calleeId,
        remoteUserName: calleeName,
        remoteUserAvatar: calleeAvatar,
        startTime: new Date().toISOString(),
        isMuted: false,
        isCameraOff: false,
        isSpeakerOff: false,
      };

      this.session = session;
      this.notifySessionChange();

      console.log('[RTC] Creating room via IM rtc sdk...');
      const room = await this.createSdkRoom(calleeId);
      const rtcConnection = await this.prepareRtcConnection(room.id, calleeId);
      console.log('[RTC] Room created:', rtcConnection.businessRoomId);

      this.session.roomId = rtcConnection.businessRoomId;
      this.session.status = 'ringing';
      this.notifySessionChange();

      try {
        await this.ensureRtcSdk(rtcConnection.rtcConfig);
        await this.initRTCConnection(callType, rtcConnection.mediaRoomId, rtcConnection.token);
      } catch (rtcError) {
        console.error('[RTC] Failed to initialize RTC connection:', rtcError);
        throw rtcError;
      }

      await this.sendRtcSignal('rtc.call', 'call', calleeId, rtcConnection.businessRoomId, {
        callType,
        roomId: rtcConnection.businessRoomId,
      });

      return true;
    } catch (error) {
      console.error('[RTC] Failed to initiate call:', error);
      if (this.session) {
        this.session = {
          ...this.session,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        this.notifySessionChange();
      }
      await this.releaseRtcResources();
      return false;
    }
  }


  async acceptCall(callId: string, roomId: string, callType: CallType): Promise<boolean> {
    try {
      const currentUserId = this.getCurrentUserId();
      console.log('[RTC] Accepting call:', callId);

      if (!this.session || this.session.id !== callId) {
        throw new Error('Call session not found');
      }

      this.session.status = 'connecting';
      this.notifySessionChange();

      const remoteUserId = this.session.remoteUserId || '';
      const rtcConnection = await this.prepareRtcConnection(roomId, remoteUserId);

      await this.ensureRtcSdk(rtcConnection.rtcConfig);
      await this.initRTCConnection(callType, rtcConnection.mediaRoomId, rtcConnection.token);

      await this.sendRtcSignal('rtc.accept', 'accept', remoteUserId, rtcConnection.businessRoomId, {
        callType,
        roomId: rtcConnection.businessRoomId,
        userId: currentUserId,
      });

      this.markSessionConnected();

      return true;
    } catch (error) {
      console.error('[RTC] Failed to accept call:', error);
      if (this.session) {
        this.session.status = 'failed';
        this.session.error = error instanceof Error ? error.message : 'Unknown error';
        this.notifySessionChange();
      }
      await this.releaseRtcResources();
      return false;
    }
  }


  async rejectCall(callId: string): Promise<boolean> {
    if (!this.session || this.session.id !== callId) {
      return false;
    }

    console.log('[RTC] Rejecting call:', callId);

    await this.sendRtcSignal(
      'rtc.reject',
      'reject',
      this.session.remoteUserId || '',
      this.session.roomId || '',
      { roomId: this.session.roomId, callId },
    );

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    try {
      await this.cleanup();
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    }
    return true;
  }


  async hangup(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    console.log('[RTC] Hanging up call:', this.session.id);

    const { roomId, remoteUserId } = this.session;

    if (remoteUserId && roomId) {
      await this.sendRtcSignal('rtc.hangup', 'hangup', remoteUserId, roomId, {
        roomId,
        callId: this.session.id,
      });
    }

    if (roomId) {
      try {
        await this.getRtcModule().rooms.end(roomId);
        console.log('[RTC] Ended room:', roomId);
      } catch (error) {
        console.error('[RTC] Error ending room:', error);
      }
    }

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
    return true;
  }


  handleIncomingCall(
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) {
    console.log('[RTC] Incoming call from:', callerId);
    const currentUserId = this.getCurrentUserId();

    const session: CallSession = {
      id: callId,
      roomId,
      callType,
      status: 'ringing',
      direction: 'incoming',
      localUserId: currentUserId,
      remoteUserId: callerId,
      remoteUserName: callerName,
      remoteUserAvatar: callerAvatar,
      startTime: new Date().toISOString(),
      isMuted: false,
      isCameraOff: false,
      isSpeakerOff: false,
    };

    this.session = session;
    this.notifySessionChange();
  }


  async handleSignal(signal: CallSignal) {
    console.log('[RTC] Received signal:', signal.type);

    if (!this.session || this.session.id !== signal.callId) {
      return;
    }

    try {
      switch (signal.type) {
        case 'accept':
          await this.handleAccept();
          break;
        case 'reject':
          await this.handleReject();
          break;
        case 'hangup':
          await this.handleHangup();
          break;
        case 'offer':
          console.log('[RTC] Received offer signal, handled by SDK');
          break;
        case 'answer':
          console.log('[RTC] Received answer signal, handled by SDK');
          break;
        case 'ice-candidate':
          console.log('[RTC] Received ice-candidate signal, handled by SDK');
          break;
      }
    } catch (error) {
      console.error('[RTC] Error handling signal:', error);
    }
  }


  async toggleMute(): Promise<boolean> {
    try {
      if (this.session) {
        const newMuteState = !this.session.isMuted;
        await this.rtcSdk.setLocalStreamEnabled(!newMuteState, !this.session.isCameraOff);
        this.session.isMuted = newMuteState;
        this.notifySessionChange();
      }
      return this.session?.isMuted || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle mute:', error);
      return this.session?.isMuted || false;
    }
  }


  async toggleCamera(): Promise<boolean> {
    try {
      if (this.session) {
        const newCameraState = !this.session.isCameraOff;
        await this.rtcSdk.setLocalStreamEnabled(!this.session.isMuted, !newCameraState);
        this.session.isCameraOff = newCameraState;
        this.notifySessionChange();
      }
      return this.session?.isCameraOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle camera:', error);
      return this.session?.isCameraOff || false;
    }
  }


  async toggleSpeaker(): Promise<boolean> {
    try {
      if (this.session) {
        this.session.isSpeakerOff = !this.session.isSpeakerOff;
        this.notifySessionChange();
      }
      return this.session?.isSpeakerOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle speaker:', error);
      return this.session?.isSpeakerOff || false;
    }
  }


  getSession(): CallSession | null {
    return this.session;
  }


  private async initRTCConnection(callType: CallType, roomId: string, token: string) {
    if (!this.rtcSdk) {
      throw new Error('RTC SDK not initialized');
    }

    try {
      await this.rtcSdk.joinRoom(roomId, this.getCurrentUserId(), token, callType);
      this.activeMediaRoomId = roomId;
      console.log('[RTC] Joined room:', roomId);

      console.log('[RTC] Getting local stream...');
      const localStream = await this.rtcSdk.getLocalStream({
        video: callType === 'video',
        audio: true
      });

      if (localStream) {
        console.log('[RTC] Local stream obtained');
        this.onLocalStream?.(localStream);

        await this.rtcSdk.publishStream(localStream);
        console.log('[RTC] Local stream published');

        if (this.session?.remoteUserId) {
          const remoteStream = await this.rtcSdk.subscribeStream(this.session.remoteUserId);
          const mediaStream = resolveRemoteMediaStream(remoteStream);
          if (mediaStream) {
            this.onRemoteStream?.(mediaStream);
          }
          console.log('[RTC] Subscribed to remote stream');
        }
      } else if (this.session) {
        this.session.isCameraOff = true;
        this.session.isMuted = true;
        this.session.error = 'No camera or microphone device detected';
        this.notifySessionChange();
      }
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC connection:', error);
      throw error;
    }
  }

  private async handleAccept() {
    if (!this.session) return;

    console.log('[RTC] Call accepted');
    this.markSessionConnected();
  }


  private async handleReject() {
    if (!this.session) return;

    console.log('[RTC] Call rejected');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }


  private async handleHangup() {
    if (!this.session) return;

    console.log('[RTC] Call hung up by remote');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }


  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      return await this.rtcSdk.getDevices(deviceType);
    } catch (error) {
      console.error('[RTC] Failed to get devices:', error);
      return [];
    }
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<boolean> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      await this.rtcSdk.switchDevice(deviceType, deviceId);
      return true;
    } catch (error) {
      console.error('[RTC] Failed to switch device:', error);
      return false;
    }
  }

  private notifySessionChange() {
    if (this.session) {
      this.onSessionChange?.({ ...this.session });
    }
  }

  private markSessionConnected() {
    if (!this.session) {
      return;
    }
    this.session.status = 'connected';
    this.session.connectTime = this.session.connectTime || new Date().toISOString();
    this.notifySessionChange();
  }


  private generateCallId(): string {
    return generateUUID();
  }

  private async releaseRtcResources() {
    try {
      if (this.rtcSdk && this.activeMediaRoomId) {
        await this.rtcSdk.leaveRoom(this.activeMediaRoomId);
        console.log('[RTC] Left room:', this.activeMediaRoomId);
      }
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    } finally {
      try {
        await this.rtcSdk?.destroy?.();
      } catch (error) {
        console.error('[RTC] Error destroying RTC SDK:', error);
      }
      this.rtcSdk = null;
      this.activeMediaRoomId = null;
    }
  }


  private async cleanup() {
    console.log('[RTC] Cleaning up resources');
    await this.releaseRtcResources();
    this.session = null;
    this.onSessionChange?.(null);
  }
}

let rtcServiceInstance: RTCService | null = null;


interface RTCServiceCallbacks {
  onSessionChange?: (session: CallSession | null) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onSignal?: (signal: CallSignal) => void;
}


export function getRTCService(callbacks?: RTCServiceCallbacks): RTCService {
  if (!rtcServiceInstance) {
    rtcServiceInstance = new RTCService(callbacks);
  } else if (callbacks) {
    rtcServiceInstance.updateCallbacks(callbacks);
  }
  return rtcServiceInstance;
}


export function destroyRTCService() {
  const instance = rtcServiceInstance;
  rtcServiceInstance = null;
  void instance?.dispose();
}
