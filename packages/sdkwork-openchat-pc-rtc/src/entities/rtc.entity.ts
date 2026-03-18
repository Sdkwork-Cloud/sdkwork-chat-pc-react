

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
export type CallDirection = 'outgoing' | 'incoming';


export interface RTCRoom {
  id: string;
  uuid: string;
  name?: string;
  type: 'p2p' | 'group';
  creatorId: string;
  participants: string[];
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
}


export interface RTCToken {
  id: string;
  uuid: string;
  roomId: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}


export interface CallSession {
  id: string;
  roomId?: string;
  callType: CallType;
  status: CallStatus;
  direction: CallDirection;
  localUserId: string;
  remoteUserId?: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  startTime?: string;
  connectTime?: string;
  endTime?: string;
  duration?: number; 
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOff: boolean;
  error?: string;
}


export interface CreateRoomRequest {
  type: 'p2p' | 'group';
  participants: string[];
  name?: string;
}


export interface CreateRoomResponse {
  room: RTCRoom;
  token: RTCToken;
}


export interface CallSignal {
  type: 'call' | 'accept' | 'reject' | 'hangup' | 'ice-candidate' | 'offer' | 'answer';
  callId: string;
  from: string;
  to: string;
  payload?: unknown;
  timestamp: string;
}


export interface InitiateCallRequest {
  calleeId: string;
  callType: CallType;
}


export interface CallRecord {
  id: string;
  callType: CallType;
  direction: CallDirection;
  remoteUserId: string;
  remoteUserName: string;
  remoteUserAvatar?: string;
  status: 'completed' | 'missed' | 'rejected' | 'failed';
  duration?: number;
  timestamp: string;
}
