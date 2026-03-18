

import type {
  CallSession,
  CallType,
  CallSignal,
} from '../entities/rtc.entity';
import {
  createRoom,
  endRoom,
  getToken,
} from '../repositories/rtc.repository';
import { generateUUID } from '@sdkwork/openchat-pc-kernel';
import {
  createRTCSDK,
  RTCConfig,
  DEFAULT_RTC_CONFIG,
  DeviceType,
  DeviceInfo,
} from './sdk-adapter';

const CURRENT_USER_ID = 'current-user';

const MOCK_SIGNALING = true;

const RTC_SERVICE_VERSION = '1.0.9';




export class RTCService {
  private session: CallSession | null = null;
  private rtcSdk: any = null;
  private rtcConfig: RTCConfig = DEFAULT_RTC_CONFIG;
  private onSessionChange: ((session: CallSession | null) => void) | null = null;
  private onLocalStream: ((stream: MediaStream) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private signalHandler: ((signal: CallSignal) => void) | null = null;

  constructor(callbacks?: {
    onSessionChange?: (session: CallSession | null) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onSignal?: (signal: CallSignal) => void;
  }, config?: RTCConfig) {
    this.onSessionChange = callbacks?.onSessionChange || null;
    this.onLocalStream = callbacks?.onLocalStream || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.signalHandler = callbacks?.onSignal || null;
    this.rtcConfig = config || DEFAULT_RTC_CONFIG;
    this.initRTCSDK();
  }

  
  private async initRTCSDK() {
    try {
      this.rtcSdk = createRTCSDK(this.rtcConfig);
      await this.rtcSdk.init(this.rtcConfig);
      
      this.rtcSdk.on('stream-added', (event: any) => {
        console.log('[RTC] Stream added:', event);
      });
      
      this.rtcSdk.on('stream-updated', (event: any) => {
        console.log('[RTC] Stream updated:', event);
      });
      
      this.rtcSdk.on('stream-removed', (event: any) => {
        console.log('[RTC] Stream removed:', event);
      });
      
      this.rtcSdk.on('room-state-changed', (event: any) => {
        console.log('[RTC] Room state changed:', event);
      });
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
      console.log('[RTC] Initiating call to:', calleeId, 'type:', callType);

      const session: CallSession = {
        id: this.generateCallId(),
        callType,
        status: 'calling',
        direction: 'outgoing',
        localUserId: CURRENT_USER_ID,
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

      console.log('[RTC] Creating room...');
      const { room, token } = await createRoom({
        type: 'p2p',
        participants: [CURRENT_USER_ID, calleeId],
      });
      console.log('[RTC] Room created:', room.id);

      this.session.roomId = room.id;
      this.session.status = 'ringing';
      this.notifySessionChange();

      try {
        await this.initRTCConnection(callType, room.id, token.token);
      } catch (rtcError) {
        console.error('[RTC] Failed to initialize RTC connection:', rtcError);
      }

      this.sendSignal({
        type: 'call',
        callId: session.id,
        from: CURRENT_USER_ID,
        to: calleeId,
        payload: {
          roomId: room.id,
          token: token.token,
          callType,
        },
        timestamp: new Date().toISOString(),
      });

      if (MOCK_SIGNALING) {
        setTimeout(() => {
          console.log('[RTC] Mock: Auto accepting call after 3s');
          this.simulateAcceptCall();
        }, 3000);
      }

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
      return false;
    }
  }

  
  async acceptCall(callId: string, roomId: string, callType: CallType): Promise<boolean> {
    try {
      console.log('[RTC] Accepting call:', callId);

      if (!this.session || this.session.id !== callId) {
        throw new Error('Call session not found');
      }

      this.session.status = 'connecting';
      this.session.connectTime = new Date().toISOString();
      this.notifySessionChange();

      const tokenResult = await getToken(roomId);

      await this.initRTCConnection(callType, roomId, tokenResult.token);

      this.sendSignal({
        type: 'accept',
        callId,
        from: CURRENT_USER_ID,
        to: this.session.remoteUserId || '',
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('[RTC] Failed to accept call:', error);
      if (this.session) {
        this.session.status = 'failed';
        this.session.error = error instanceof Error ? error.message : 'Unknown error';
        this.notifySessionChange();
      }
      return false;
    }
  }

  
  async rejectCall(callId: string): Promise<boolean> {
    if (!this.session || this.session.id !== callId) {
      return false;
    }

    console.log('[RTC] Rejecting call:', callId);

    this.sendSignal({
      type: 'reject',
      callId,
      from: CURRENT_USER_ID,
      to: this.session.remoteUserId || '',
      timestamp: new Date().toISOString(),
    });

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

    if (remoteUserId) {
      this.sendSignal({
        type: 'hangup',
        callId: this.session.id,
        from: CURRENT_USER_ID,
        to: remoteUserId,
        timestamp: new Date().toISOString(),
      });
    }

    if (roomId) {
      try {
        await endRoom(roomId);
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

    const session: CallSession = {
      id: callId,
      roomId,
      callType,
      status: 'ringing',
      direction: 'incoming',
      localUserId: CURRENT_USER_ID,
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
      await this.rtcSdk.joinRoom(roomId, CURRENT_USER_ID, token, callType);
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
          await this.rtcSdk.subscribeStream(this.session.remoteUserId);
          console.log('[RTC] Subscribed to remote stream');
        }
      } else {
        if (MOCK_SIGNALING) {
          if (this.session) {
            this.session.isCameraOff = true;
            this.session.isMuted = true;
            this.session.error = 'No camera or microphone device detected';
            this.notifySessionChange();
          }
        }
      }
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC connection:', error);
      throw error;
    }
  }

  
  private async simulateAcceptCall() {
    if (!this.session) return;

    console.log('[RTC] Simulating accept call');

    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();

    setTimeout(() => {
      if (this.session) {
        this.session.status = 'connected';
        this.notifySessionChange();
        console.log('[RTC] Call connected (simulated)');
      }
    }, 1000);
  }

  
  private async handleAccept() {
    if (!this.session) return;

    console.log('[RTC] Call accepted');
    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();
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

  
  private sendSignal(signal: CallSignal) {
    console.log('[RTC] Sending signal:', signal.type, 'to:', signal.to);

    this.signalHandler?.(signal);

    if (MOCK_SIGNALING && signal.type === 'call') {
      console.log('[RTC] Mock: Simulating remote user receiving call');
    }
  }

  
  private notifySessionChange() {
    if (this.session) {
      this.onSessionChange?.({ ...this.session });
    }
  }

  
  private generateCallId(): string {
    return generateUUID();
  }

  
  private async cleanup() {
    console.log('[RTC] Cleaning up resources');
    
    try {
      if (this.rtcSdk && this.session?.roomId) {
        await this.rtcSdk.leaveRoom(this.session.roomId);
        console.log('[RTC] Left room:', this.session.roomId);
      }
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    } finally {
      this.rtcSdk = null;
      this.session = null;
      this.onSessionChange?.(null);
    }
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
  }
  return rtcServiceInstance;
}


export function destroyRTCService() {
  rtcServiceInstance = null;
}

