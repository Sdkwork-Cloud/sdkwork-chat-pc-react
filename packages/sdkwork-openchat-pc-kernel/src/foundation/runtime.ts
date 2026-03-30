export function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const runtimeWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_IPC__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return Boolean(
    runtimeWindow.__TAURI__
      || runtimeWindow.__TAURI_IPC__
      || runtimeWindow.__TAURI_INTERNALS__,
  );
}

export default isTauriRuntime;
