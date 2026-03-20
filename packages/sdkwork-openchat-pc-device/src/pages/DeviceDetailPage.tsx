import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import {
  DeviceMessageDirection,
  DeviceMessageType,
  DeviceStatus,
  type Device,
  type DeviceMessage,
} from "../entities/device.entity";
import { DeviceResultService } from "../services";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

export function DeviceDetailPage() {
  const navigate = useNavigate();
  const { deviceId } = useParams();
  const { tr, formatDateTime } = useAppTranslation();

  const statusLabel = useCallback(
    (status: DeviceStatus): string => {
      if (status === DeviceStatus.ONLINE) {
        return tr("Online");
      }
      if (status === DeviceStatus.OFFLINE) {
        return tr("Offline");
      }
      return tr("Unknown");
    },
    [tr],
  );

  const directionLabel = useCallback(
    (direction: DeviceMessageDirection): string => {
      return direction === DeviceMessageDirection.TO_DEVICE ? tr("Outbound") : tr("Inbound");
    },
    [tr],
  );

  const [device, setDevice] = useState<Device | null>(null);
  const [messages, setMessages] = useState<DeviceMessage[]>([]);
  const [commandTopic, setCommandTopic] = useState("status");
  const [payloadText, setPayloadText] = useState('{\n  "action": "status"\n}');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadDetail = useCallback(async (targetDeviceId: string) => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [detail, logs] = await Promise.all([
        DeviceResultService.getDevice(targetDeviceId),
        DeviceResultService.getDeviceMessages(targetDeviceId, 50),
      ]);
      setDevice(detail.data || null);
      setMessages(logs.data || []);
      if (!detail.success || !logs.success) {
        setErrorText(detail.error || logs.error || detail.message || logs.message || tr("Failed to load device details."));
      }
    } catch (error) {
      setDevice(null);
      setMessages([]);
      setErrorText(error instanceof Error ? error.message : tr("Failed to load device details."));
    } finally {
      setIsLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    if (!deviceId) {
      return;
    }
    void loadDetail(deviceId);
  }, [deviceId, loadDetail]);

  const onlineStyle = useMemo(() => {
    if (!device) {
      return "bg-bg-tertiary text-text-secondary";
    }
    return device.status === DeviceStatus.ONLINE
      ? "bg-success/15 text-success"
      : "bg-bg-tertiary text-text-secondary";
  }, [device]);

  const handleToggleStatus = async () => {
    if (!device) {
      return;
    }
    setNotice(null);
    setErrorText(null);
    try {
      const nextStatus =
        device.status === DeviceStatus.ONLINE ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE;
      const result = await DeviceResultService.updateDeviceStatus(device.deviceId, nextStatus);
      if (!result.success) {
        setErrorText(result.error || result.message || tr("Failed to update status."));
        return;
      }
      setNotice(tr("Device status updated to {{status}}.", { status: statusLabel(nextStatus) }));
      await loadDetail(device.deviceId);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Failed to update status."));
    }
  };

  const handleSendCommand = async () => {
    if (!device) {
      return;
    }

    setNotice(null);
    setErrorText(null);
    setIsSending(true);
    try {
      const payload = JSON.parse(payloadText) as Record<string, unknown>;
      const result = await DeviceResultService.sendMessageToDevice(device.deviceId, {
        type: DeviceMessageType.COMMAND,
        topic: commandTopic,
        payload,
      });
      if (!result.success) {
        setErrorText(result.error || result.message || tr("Command failed."));
        return;
      }
      setNotice(tr("Command sent successfully."));
      await loadDetail(device.deviceId);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : tr("Command failed."));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {tr("Loading device details...")}
        </div>
      </section>
    );
  }

  if (!device) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <SharedUi.Button
          type="button"
          onClick={() => navigate("/devices")}
          className="w-fit rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          {tr("Back to Device List")}
        </SharedUi.Button>
        <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {tr("Device not found or inaccessible.")}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <SharedUi.Button
          type="button"
          onClick={() => navigate("/devices")}
          className="mb-2 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          {tr("Back to Device List")}
        </SharedUi.Button>
        <h1 className="text-xl font-semibold text-text-primary">{device.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">{device.deviceId}</p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {(notice || errorText) && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              errorText
                ? "border-error/30 bg-error/10 text-error"
                : "border-success/30 bg-success/10 text-success"
            }`}
          >
            {errorText || notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-5 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text-primary">{tr("Device Information")}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs ${onlineStyle}`}>
                {statusLabel(device.status)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">{tr("Type")}</p>
                <p className="mt-1 text-sm text-text-primary">{tr(device.type)}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">{tr("Updated At")}</p>
                <p className="mt-1 text-sm text-text-primary">{formatDateTime(device.updatedAt)}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">{tr("IP Address")}</p>
                <p className="mt-1 text-sm text-text-primary">{device.ipAddress || "-"}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">{tr("MAC Address")}</p>
                <p className="mt-1 text-sm text-text-primary">{device.macAddress || "-"}</p>
              </div>
            </div>

            <div className="mt-4">
              <SharedUi.Button
                type="button"
                onClick={() => void handleToggleStatus()}
                className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
              >
                {device.status === DeviceStatus.ONLINE ? tr("Set Offline") : tr("Set Online")}
              </SharedUi.Button>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-bg-primary p-4">
              <h3 className="text-sm font-semibold text-text-primary">{tr("Command Console")}</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                <SharedUi.Select
                  value={commandTopic}
                  onChange={(event) => setCommandTopic(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="status">{tr("Status")}</option>
                  <option value="control">{tr("Control")}</option>
                  <option value="reboot">{tr("Reboot")}</option>
                </SharedUi.Select>
                <SharedUi.Button
                  type="button"
                  onClick={() => void handleSendCommand()}
                  disabled={isSending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? tr("Sending...") : tr("Send Command")}
                </SharedUi.Button>
              </div>
              <SharedUi.Textarea
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                rows={8}
                className="mt-3 w-full rounded-lg border border-border bg-bg-tertiary p-3 font-mono text-xs text-text-primary focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary">{tr("Message History")}</h3>
            <div className="mt-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-xs text-text-secondary">{tr("No message records.")}</p>
              ) : (
                messages.map((item) => (
                  <article key={item.id} className="rounded-lg border border-border bg-bg-primary p-3">
                    <p className="text-xs text-text-muted">
                      {directionLabel(item.direction)} | {tr(item.type)}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">{formatDateTime(item.createdAt)}</p>
                    <pre className="mt-2 whitespace-pre-wrap break-all text-xs text-text-secondary">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default DeviceDetailPage;
