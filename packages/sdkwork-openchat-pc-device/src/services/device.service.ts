import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";
import {
  DeviceMessageDirection,
  DeviceMessageType,
  DeviceStatus,
  DeviceType,
} from "../entities/device.entity";
import type { Device, DeviceCommand, DeviceFilter, DeviceMessage } from "../entities/device.entity";

type DeviceWritePayload = {
  deviceId: string;
  type: DeviceType;
  name: string;
  description?: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
};

type DeviceMessageWritePayload = {
  type: DeviceMessageType;
  payload: unknown;
  topic?: string;
};

type DeviceApiPayload = Partial<Omit<Device, "createdAt" | "updatedAt">> & {
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type DeviceMessageApiPayload = Partial<Omit<DeviceMessage, "createdAt">> & {
  createdAt?: Date | string;
};

type DeviceStats = {
  total: number;
  online: number;
  offline: number;
  byType: { [key in DeviceType]: number };
};

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeDevice(payload: DeviceApiPayload): Device {
  return {
    id: String(payload.id ?? createId("device")),
    deviceId: String(payload.deviceId ?? ""),
    type: (payload.type as DeviceType) || DeviceType.OTHER,
    name: String(payload.name ?? "Unnamed Device"),
    description: typeof payload.description === "string" ? payload.description : undefined,
    status: (payload.status as DeviceStatus) || DeviceStatus.UNKNOWN,
    ipAddress: typeof payload.ipAddress === "string" ? payload.ipAddress : undefined,
    macAddress: typeof payload.macAddress === "string" ? payload.macAddress : undefined,
    metadata: (payload.metadata as Record<string, unknown>) || {},
    userId: typeof payload.userId === "string" ? payload.userId : undefined,
    createdAt: toDate(payload.createdAt),
    updatedAt: toDate(payload.updatedAt),
  };
}

function normalizeMessage(payload: DeviceMessageApiPayload): DeviceMessage {
  return {
    id: String(payload.id ?? createId("message")),
    deviceId: String(payload.deviceId ?? ""),
    type: (payload.type as DeviceMessageType) || DeviceMessageType.EVENT,
    direction:
      (payload.direction as DeviceMessageDirection) || DeviceMessageDirection.FROM_DEVICE,
    payload: payload.payload ?? {},
    topic: typeof payload.topic === "string" ? payload.topic : undefined,
    processed: Boolean(payload.processed),
    error: typeof payload.error === "string" ? payload.error : undefined,
    createdAt: toDate(payload.createdAt),
  };
}

function toDeviceStats(devices: Device[]): DeviceStats {
  return {
    total: devices.length,
    online: devices.filter((item) => item.status === DeviceStatus.ONLINE).length,
    offline: devices.filter((item) => item.status === DeviceStatus.OFFLINE).length,
    byType: {
      [DeviceType.XIAOZHI]: devices.filter((item) => item.type === DeviceType.XIAOZHI).length,
      [DeviceType.OTHER]: devices.filter((item) => item.type === DeviceType.OTHER).length,
    },
  };
}

class DeviceService {
  async registerDevice(payload: DeviceWritePayload): Promise<Device> {
    const response = await getAppSdkClientWithSession().notification.registerDevice(payload as any);
    return normalizeDevice(unwrapData<DeviceApiPayload>(response));
  }

  async getDevices(filter?: DeviceFilter): Promise<Device[]> {
    const response = await getAppSdkClientWithSession().notification.listDevices();
    const data = unwrapData<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] }).items)
        ? ((data as { items: unknown[] }).items ?? [])
        : [];
    return list
      .map((item) => normalizeDevice(item as DeviceApiPayload))
      .filter((item) => {
        if (filter?.type && item.type !== filter.type) {
          return false;
        }
        if (filter?.status && item.status !== filter.status) {
          return false;
        }
        if (filter?.keyword?.trim()) {
          const keyword = filter.keyword.trim().toLowerCase();
          const haystack = `${item.name} ${item.description || ""} ${item.deviceId}`.toLowerCase();
          return haystack.includes(keyword);
        }
        return true;
      });
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    const devices = await this.getDevices();
    const target = devices.find((item) => item.deviceId === deviceId);
    return target ? { ...target } : null;
  }

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device | null> {
    const response = await getAppSdkClientWithSession().notification.updateDeviceStatus(
      deviceId,
      { status } as any,
    );
    return normalizeDevice(unwrapData<DeviceApiPayload>(response));
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    await getAppSdkClientWithSession().notification.unregisterDevice(deviceId);
    return true;
  }

  async sendMessageToDevice(deviceId: string, message: DeviceMessageWritePayload): Promise<DeviceMessage> {
    const response = await getAppSdkClientWithSession().notification.sendDeviceMessage(
      deviceId,
      message as any,
    );
    return normalizeMessage(unwrapData<DeviceMessageApiPayload>(response));
  }

  async getDeviceMessages(deviceId: string, limit: number = 50, before?: Date): Promise<DeviceMessage[]> {
    const params: Record<string, unknown> = { limit };
    if (before) {
      params.before = before.toISOString();
    }
    const response = await getAppSdkClientWithSession().notification.listDeviceMessages(
      deviceId,
      params as any,
    );
    const data = unwrapData<unknown>(response);
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] }).items)
        ? ((data as { items: unknown[] }).items ?? [])
        : [];
    return list.map((item) => normalizeMessage(item as DeviceMessageApiPayload));
  }

  async controlDevice(deviceId: string, command: DeviceCommand): Promise<boolean> {
    const response = await getAppSdkClientWithSession().notification.controlDevice(
      deviceId,
      command as any,
    );
    const result = unwrapData<unknown>(response);
    return typeof result === "boolean" ? result : true;
  }

  async getDeviceStats(): Promise<DeviceStats> {
    const devices = await this.getDevices();
    return toDeviceStats(devices);
  }
}

export const deviceService = new DeviceService();
export default deviceService;
