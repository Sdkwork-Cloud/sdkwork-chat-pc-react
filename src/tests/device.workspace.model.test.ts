import { describe, expect, it } from "vitest";
import {
  buildDeviceWorkspaceSummary,
  filterDevices,
  statusLabel,
} from "@sdkwork/openchat-pc-device";
import { DeviceStatus, DeviceType } from "@sdkwork/openchat-pc-device";

describe("device workspace model", () => {
  it("filters devices, summarizes status counts and resolves labels", () => {
    const devices = [
      { id: "1", deviceId: "d1", type: DeviceType.XIAOZHI, name: "Desk", status: DeviceStatus.ONLINE, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", deviceId: "d2", type: DeviceType.OTHER, name: "Sensor", status: DeviceStatus.OFFLINE, createdAt: new Date(), updatedAt: new Date() },
    ];

    expect(filterDevices(devices, { type: DeviceType.XIAOZHI, status: undefined, keyword: "" })).toHaveLength(1);
    expect(buildDeviceWorkspaceSummary(devices)).toMatchObject({ total: 2, online: 1, offline: 1, unknown: 0 });
    expect(statusLabel(DeviceStatus.ONLINE)).toBeTruthy();
  });
});
