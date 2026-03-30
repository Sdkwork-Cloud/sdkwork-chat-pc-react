export const DESKTOP_COMMANDS = {
  setAppLanguage: "set_app_language",
  createPty: "create_pty",
  writePty: "write_pty",
  resizePty: "resize_pty",
  destroyPty: "destroy_pty",
} as const;

export type DesktopCommandName =
  (typeof DESKTOP_COMMANDS)[keyof typeof DESKTOP_COMMANDS];

export const DESKTOP_EVENTS = {
  trayNavigate: "tray://navigate",
} as const;

export type DesktopEventName = (typeof DESKTOP_EVENTS)[keyof typeof DESKTOP_EVENTS];
