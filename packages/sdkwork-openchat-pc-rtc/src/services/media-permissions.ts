import { translate } from "@sdkwork/openchat-pc-i18n";

export type MediaPermissionName = "camera" | "microphone";
export type MediaPermissionState = PermissionState | "unsupported";

export interface MediaPermissionSnapshot {
  camera: MediaPermissionState;
  microphone: MediaPermissionState;
}

interface MediaAccessErrorOptions {
  audio?: boolean;
  video?: boolean;
  displayCapture?: boolean;
}

type DisplayCaptureConstraints = {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
};

function hasBrowserMediaDevices() {
  return (
    typeof navigator !== "undefined"
    && typeof navigator.mediaDevices !== "undefined"
  );
}

function hasUserMediaSupport() {
  return hasBrowserMediaDevices()
    && typeof navigator.mediaDevices.getUserMedia === "function";
}

function hasDisplayCaptureSupport() {
  return hasBrowserMediaDevices()
    && typeof navigator.mediaDevices.getDisplayMedia === "function";
}

function resolveDeniedMessage(options: MediaAccessErrorOptions) {
  if (options.displayCapture) {
    return translate("Screen capture was cancelled or denied.");
  }

  if (options.audio && options.video) {
    return translate("Please allow camera and microphone permissions.");
  }

  if (options.video) {
    return translate("Unable to access the camera. Check your device permissions.");
  }

  if (options.audio) {
    return translate("Unable to access the microphone. Check your device permissions.");
  }

  return translate("Unable to access media devices.");
}

function resolveMissingDeviceMessage(options: MediaAccessErrorOptions) {
  if (options.audio && options.video) {
    return translate("No camera or microphone device was found.");
  }

  if (options.video) {
    return translate("No camera device was found.");
  }

  if (options.audio) {
    return translate("No microphone device was found.");
  }

  return translate("Unable to access media devices.");
}

export function resolveMediaAccessError(
  error: unknown,
  options: MediaAccessErrorOptions = {},
): Error {
  if (!(error instanceof DOMException)) {
    if (error instanceof Error) {
      return error;
    }

    return new Error(translate("Unable to access media devices."));
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
    case "AbortError":
      return new Error(resolveDeniedMessage(options));
    case "NotFoundError":
      return new Error(resolveMissingDeviceMessage(options));
    case "NotReadableError":
      return new Error(translate("The device is busy or could not be started."));
    case "OverconstrainedError":
      return new Error(
        translate("Requested resolution is not supported by the device."),
      );
    default:
      return new Error(translate("Unable to access media devices."));
  }
}

export async function getMediaPermissionState(
  permissionName: MediaPermissionName,
): Promise<MediaPermissionState> {
  if (
    typeof navigator === "undefined"
    || typeof navigator.permissions === "undefined"
    || typeof navigator.permissions.query !== "function"
  ) {
    return "unsupported";
  }

  try {
    const permissionStatus = await navigator.permissions.query({
      name: permissionName as PermissionName,
    });
    return permissionStatus.state;
  } catch {
    return "unsupported";
  }
}

export async function getMediaPermissionSnapshot(): Promise<MediaPermissionSnapshot> {
  const [camera, microphone] = await Promise.all([
    getMediaPermissionState("camera"),
    getMediaPermissionState("microphone"),
  ]);

  return {
    camera,
    microphone,
  };
}

export async function enumerateAvailableMediaDevices(): Promise<MediaDeviceInfo[]> {
  if (!hasBrowserMediaDevices() || typeof navigator.mediaDevices.enumerateDevices !== "function") {
    return [];
  }

  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }
}

export async function requestUserMediaStream(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  const audio = constraints.audio !== false;
  const video = constraints.video !== false;

  if (!hasUserMediaSupport()) {
    throw new Error(
      translate("Media device APIs are unavailable in the current runtime."),
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    throw resolveMediaAccessError(error, { audio, video });
  }
}

export async function requestDisplayCaptureStream(
  constraints: DisplayCaptureConstraints = {
    video: true,
    audio: false,
  },
): Promise<MediaStream> {
  if (!hasDisplayCaptureSupport()) {
    throw new Error(
      translate("Screen capture is unavailable in the current runtime."),
    );
  }

  try {
    return await navigator.mediaDevices.getDisplayMedia(constraints);
  } catch (error) {
    throw resolveMediaAccessError(error, { displayCapture: true });
  }
}
