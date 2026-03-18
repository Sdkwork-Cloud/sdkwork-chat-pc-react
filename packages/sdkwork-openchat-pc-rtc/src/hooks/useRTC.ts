

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CallSession, CallType, CallSignal } from '../entities/rtc.entity';
import { getRTCService } from '../services';

export interface UseRTCReturn {
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isInCall: boolean;
  isCalling: boolean;
  isRinging: boolean;
  isConnected: boolean;

  initiateCall: (calleeId: string, calleeName: string, calleeAvatar: string, callType: CallType) => Promise<boolean>;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => Promise<boolean>;
  hangup: () => Promise<boolean>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleSpeaker: () => Promise<void>;

  handleIncomingCall: (
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) => void;

  handleSignal: (signal: CallSignal) => Promise<void>;
}

/**
 * RTC Hook
 */
export function useRTC(): UseRTCReturn {
  const [session, setSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const serviceRef = useRef(getRTCService({
    onSessionChange: (newSession: CallSession | null) => {
      setSession(newSession);
    },
    onLocalStream: (stream: MediaStream) => {
      setLocalStream(stream);
    },
    onRemoteStream: (stream: MediaStream) => {
      setRemoteStream(stream);
    },
  }));

  const isInCall = session !== null && session.status !== 'ended' && session.status !== 'failed';
  const isCalling = session?.status === 'calling';
  const isRinging = session?.status === 'ringing';
  const isConnected = session?.status === 'connected';

  const initiateCall = useCallback(async (
    calleeId: string,
    calleeName: string,
    calleeAvatar: string,
    callType: CallType
  ): Promise<boolean> => {
    return serviceRef.current.initiateCall(calleeId, calleeName, calleeAvatar, callType);
  }, []);

  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!session?.roomId) return false;
    return serviceRef.current.acceptCall(session.id, session.roomId, session.callType);
  }, [session]);

  const rejectCall = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    const result = await serviceRef.current.rejectCall(session.id);
    if (result) {
      setLocalStream(null);
      setRemoteStream(null);
    }
    return result;
  }, [session]);

  const hangup = useCallback(async (): Promise<boolean> => {
    const result = await serviceRef.current.hangup();
    if (result) {
      setLocalStream(null);
      setRemoteStream(null);
    }
    return result;
  }, []);

  const toggleMute = useCallback(async (): Promise<void> => {
    await serviceRef.current.toggleMute();
  }, []);

  const toggleCamera = useCallback(async (): Promise<void> => {
    await serviceRef.current.toggleCamera();
  }, []);

  const toggleSpeaker = useCallback(async (): Promise<void> => {
    await serviceRef.current.toggleSpeaker();
  }, []);

  const handleIncomingCall = useCallback((
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) => {
    serviceRef.current.handleIncomingCall(callId, callerId, callerName, callerAvatar, roomId, callType);
  }, []);

  const handleSignal = useCallback(async (signal: CallSignal) => {
    await serviceRef.current.handleSignal(signal);
  }, []);

  useEffect(() => {
    return () => {
      if (session && session.status !== 'ended' && session.status !== 'failed') {
        serviceRef.current.hangup();
      }
    };
  }, [session]);

  return {
    session,
    localStream,
    remoteStream,
    isInCall,
    isCalling,
    isRinging,
    isConnected,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    handleIncomingCall,
    handleSignal,
  };
}
