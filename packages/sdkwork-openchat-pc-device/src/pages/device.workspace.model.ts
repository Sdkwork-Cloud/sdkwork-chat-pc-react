import { DeviceStatus, DeviceType, type Device, type DeviceFilter } from "../entities/device.entity";

export interface DeviceWorkspaceSummary {
  total: number;
  online: number;
  offline: number;
  unknown: number;
}

export function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case DeviceStatus.ONLINE:
      return "online";
    case DeviceStatus.OFFLINE:
      return "offline";
    default:
      return "unknown";
  }
}

export function typeLabel(type: DeviceType): string {
  return type === DeviceType.XIAOZHI ? "xiaozhi" : "other iot";
}

export function filterDevices(devices: readonly Device[], filter: DeviceFilter): Device[] {
  const keyword = filter.keyword?.trim().toLowerCase() || "";

  return devices.filter((device) => {
    if (filter.type && device.type !== filter.type) {
      return false;
    }
    if (filter.status && device.status !== filter.status) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${device.name} ${device.deviceId}`.toLowerCase().includes(keyword);
  });
}

export function buildDeviceWorkspaceSummary(devices: readonly Device[]): DeviceWorkspaceSummary {
  return devices.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] += 1;
      return acc;
    },
    { total: 0, online: 0, offline: 0, unknown: 0 },
  );
}
