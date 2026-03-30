import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CallSession } from "../../packages/sdkwork-openchat-pc-rtc/src/entities/rtc.entity";
import { useRTC } from "../../packages/sdkwork-openchat-pc-rtc/src/hooks/useRTC";

const mocks = vi.hoisted(() => {
  const service = {
    initiateCall: vi.fn(async () => true),
    acceptCall: vi.fn(async () => true),
    rejectCall: vi.fn(async () => true),
    hangup: vi.fn(async () => true),
    toggleMute: vi.fn(async () => undefined),
    toggleCamera: vi.fn(async () => undefined),
    toggleSpeaker: vi.fn(async () => undefined),
    handleIncomingCall: vi.fn(),
    handleSignal: vi.fn(async () => undefined),
  };

  return {
    callbacks: null as
      | {
          onSessionChange?: (session: CallSession | null) => void;
          onLocalStream?: (stream: MediaStream) => void;
          onRemoteStream?: (stream: MediaStream) => void;
        }
      | null,
    service,
  };
});

vi.mock("../../packages/sdkwork-openchat-pc-rtc/src/services", () => ({
  getRTCService: vi.fn((callbacks?: typeof mocks.callbacks) => {
    mocks.callbacks = callbacks ?? null;
    return mocks.service;
  }),
}));

describe("useRTC hook", () => {
  beforeEach(() => {
    mocks.callbacks = null;
    mocks.service.initiateCall.mockClear();
    mocks.service.acceptCall.mockClear();
    mocks.service.rejectCall.mockClear();
    mocks.service.hangup.mockClear();
    mocks.service.toggleMute.mockClear();
    mocks.service.toggleCamera.mockClear();
    mocks.service.toggleSpeaker.mockClear();
    mocks.service.handleIncomingCall.mockClear();
    mocks.service.handleSignal.mockClear();
  });

  it("does not hang up active calls when session state updates during normal progress", () => {
    renderHook(() => useRTC());

    const callingSession: CallSession = {
      id: "call-1",
      roomId: "room-1",
      callType: "audio",
      status: "calling",
      direction: "outgoing",
      localUserId: "user-1",
      remoteUserId: "user-2",
      remoteUserName: "Alice",
      startTime: "2026-03-30T00:00:00.000Z",
      isMuted: false,
      isCameraOff: false,
      isSpeakerOff: false,
    };

    act(() => {
      mocks.callbacks?.onSessionChange?.(callingSession);
    });

    act(() => {
      mocks.callbacks?.onSessionChange?.({
        ...callingSession,
        status: "ringing",
      });
    });

    act(() => {
      mocks.callbacks?.onSessionChange?.({
        ...callingSession,
        status: "connected",
        connectTime: "2026-03-30T00:00:05.000Z",
      });
    });

    expect(mocks.service.hangup).not.toHaveBeenCalled();
  });

  it("clears local and remote streams when the rtc session is cleared", () => {
    const { result } = renderHook(() => useRTC());
    const localStream = { id: "local-stream" } as unknown as MediaStream;
    const remoteStream = { id: "remote-stream" } as unknown as MediaStream;

    act(() => {
      mocks.callbacks?.onLocalStream?.(localStream);
      mocks.callbacks?.onRemoteStream?.(remoteStream);
      mocks.callbacks?.onSessionChange?.({
        id: "call-2",
        roomId: "room-2",
        callType: "video",
        status: "connected",
        direction: "incoming",
        localUserId: "user-1",
        remoteUserId: "user-2",
        remoteUserName: "Alice",
        connectTime: "2026-03-30T00:00:10.000Z",
        isMuted: false,
        isCameraOff: false,
        isSpeakerOff: false,
      });
    });

    expect(result.current.localStream).toBe(localStream);
    expect(result.current.remoteStream).toBe(remoteStream);

    act(() => {
      mocks.callbacks?.onSessionChange?.(null);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.localStream).toBeNull();
    expect(result.current.remoteStream).toBeNull();
  });
});
