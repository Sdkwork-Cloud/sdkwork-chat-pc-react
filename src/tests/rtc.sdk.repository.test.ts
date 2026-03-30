import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const appControllerCreateRoomMock = vi.fn();
  const appControllerGenerateTokenMock = vi.fn();
  const appControllerGetRoomByIdMock = vi.fn();
  const appControllerEndRoomMock = vi.fn();
  const appControllerGetRoomsByUserIdMock = vi.fn();

  const legacyRtcClient = {
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    endRoom: vi.fn(),
    createRoomToken: vi.fn(),
    listRecords: vi.fn(),
  };

  return {
    appControllerCreateRoomMock,
    appControllerGenerateTokenMock,
    appControllerGetRoomByIdMock,
    appControllerEndRoomMock,
    appControllerGetRoomsByUserIdMock,
    legacyRtcClient,
  };
});

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    IS_DEV: false,
    generateUUID: vi.fn(() => "generated-id"),
    getPcImSessionIdentity: vi.fn(() => ({
      userId: "user-1",
      username: "neo",
      displayName: "Neo",
      authToken: "auth-token",
      accessToken: "access-token",
    })),
    getPcImSdkClient: vi.fn(() => ({
      rtc: {
        appControllerCreateRoom: mocks.appControllerCreateRoomMock,
        appControllerGenerateToken: mocks.appControllerGenerateTokenMock,
        appControllerGetRoomById: mocks.appControllerGetRoomByIdMock,
        appControllerEndRoom: mocks.appControllerEndRoomMock,
        appControllerGetRoomsByUserId: mocks.appControllerGetRoomsByUserIdMock,
      },
    })),
    getAppSdkClientWithSession: vi.fn(() => ({
      rtc: mocks.legacyRtcClient,
    })),
  };
});

describe("rtc sdk-backed repository", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.appControllerCreateRoomMock.mockReset();
    mocks.appControllerGenerateTokenMock.mockReset();
    mocks.appControllerGetRoomByIdMock.mockReset();
    mocks.appControllerEndRoomMock.mockReset();
    mocks.appControllerGetRoomsByUserIdMock.mockReset();

    mocks.legacyRtcClient.createRoom.mockReset().mockRejectedValue(
      new Error("legacy rtc app sdk should not be used"),
    );
    mocks.legacyRtcClient.getRoom.mockReset().mockRejectedValue(
      new Error("legacy rtc app sdk should not be used"),
    );
    mocks.legacyRtcClient.endRoom.mockReset().mockRejectedValue(
      new Error("legacy rtc app sdk should not be used"),
    );
    mocks.legacyRtcClient.createRoomToken.mockReset().mockRejectedValue(
      new Error("legacy rtc app sdk should not be used"),
    );
    mocks.legacyRtcClient.listRecords.mockReset().mockRejectedValue(
      new Error("legacy rtc app sdk should not be used"),
    );
  });

  it("creates rtc rooms and tokens through the IM sdk backend client", async () => {
    mocks.appControllerCreateRoomMock.mockResolvedValue({
      id: "room-1",
      type: "p2p",
      participants: ["user-1", "user-2"],
      creatorId: "user-1",
      status: "active",
      startedAt: "2026-03-30T00:00:00.000Z",
    });
    mocks.appControllerGenerateTokenMock.mockResolvedValue({
      id: "token-1",
      roomId: "room-1",
      userId: "user-1",
      token: "rtc-sdk-token",
      expiresAt: "2026-03-30T01:00:00.000Z",
      createdAt: "2026-03-30T00:00:00.000Z",
    });

    const { createRoom } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/repositories/rtc.repository"
    );

    const result = await createRoom({
      type: "p2p",
      participants: ["user-1", "user-2"],
    });

    expect(mocks.appControllerCreateRoomMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "p2p",
        participants: ["user-1", "user-2"],
      }),
    );
    expect(mocks.appControllerGenerateTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-1",
        userId: "user-1",
      }),
    );
    expect(mocks.legacyRtcClient.createRoom).not.toHaveBeenCalled();
    expect(mocks.legacyRtcClient.createRoomToken).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      room: {
        id: "room-1",
        participants: ["user-1", "user-2"],
      },
      token: {
        roomId: "room-1",
        userId: "user-1",
        token: "rtc-sdk-token",
      },
    });
  });

  it("loads room detail, ends room, resolves room tokens, and maps room history through the IM sdk backend client", async () => {
    mocks.appControllerGetRoomByIdMock.mockResolvedValue({
      id: "room-2",
      type: "p2p",
      participants: ["user-1", "user-2"],
      creatorId: "user-2",
      status: "ended",
      startedAt: "2026-03-30T00:00:00.000Z",
      endedAt: "2026-03-30T00:03:00.000Z",
    });
    mocks.appControllerGenerateTokenMock.mockResolvedValue({
      id: "token-2",
      roomId: "room-2",
      userId: "user-1",
      token: "rtc-sdk-token-2",
      expiresAt: "2026-03-30T01:00:00.000Z",
      createdAt: "2026-03-30T00:00:00.000Z",
    });
    mocks.appControllerGetRoomsByUserIdMock.mockResolvedValue([
      {
        id: "room-2",
        type: "p2p",
        participants: ["user-1", "user-2"],
        creatorId: "user-2",
        status: "ended",
        startedAt: "2026-03-30T00:00:00.000Z",
        endedAt: "2026-03-30T00:03:00.000Z",
      },
    ]);

    const { endRoom, getCallRecords, getRoom, getToken } = await import(
      "../../packages/sdkwork-openchat-pc-rtc/src/repositories/rtc.repository"
    );

    const room = await getRoom("room-2");
    const token = await getToken("room-2");
    const records = await getCallRecords();
    const ended = await endRoom("room-2");

    expect(mocks.appControllerGetRoomByIdMock).toHaveBeenCalledWith("room-2");
    expect(mocks.appControllerEndRoomMock).toHaveBeenCalledWith("room-2");
    expect(mocks.appControllerGenerateTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "room-2",
        userId: "user-1",
      }),
    );
    expect(mocks.appControllerGetRoomsByUserIdMock).toHaveBeenCalledWith("user-1");
    expect(mocks.legacyRtcClient.getRoom).not.toHaveBeenCalled();
    expect(mocks.legacyRtcClient.endRoom).not.toHaveBeenCalled();
    expect(mocks.legacyRtcClient.createRoomToken).not.toHaveBeenCalled();
    expect(mocks.legacyRtcClient.listRecords).not.toHaveBeenCalled();
    expect(room).toMatchObject({
      id: "room-2",
      participants: ["user-1", "user-2"],
      status: "ended",
    });
    expect(token).toMatchObject({
      roomId: "room-2",
      userId: "user-1",
      token: "rtc-sdk-token-2",
    });
    expect(records).toEqual([
      expect.objectContaining({
        remoteUserId: "user-2",
        direction: "incoming",
        status: "completed",
      }),
    ]);
    expect(ended).toBe(true);
  });
});
