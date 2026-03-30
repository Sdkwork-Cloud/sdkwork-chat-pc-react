/**
 * Test environment bootstrap.
 *
 * Responsibilities:
 * - configure global browser mocks
 * - provide stable storage behavior
 * - force a deterministic locale for UI rendering tests
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";
import { initializeI18n } from "@sdkwork/openchat-pc-i18n";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

const localStorageStore = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => (localStorageStore.has(key) ? localStorageStore.get(key)! : null)),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore.set(String(key), String(value));
  }),
  removeItem: vi.fn((key: string) => {
    localStorageStore.delete(String(key));
  }),
  clear: vi.fn(() => {
    localStorageStore.clear();
  }),
  key: vi.fn((index: number) => Array.from(localStorageStore.keys())[index] ?? null),
  get length() {
    return localStorageStore.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

localStorageStore.set("openchat.locale", "en-US");

Object.defineProperty(window.URL, "createObjectURL", {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window.URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

function createMockDomRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

function createMockDomRectList(): DOMRectList {
  const rect = createMockDomRect();
  const rectList = [rect] as unknown as DOMRectList & DOMRect[];
  rectList.item = vi.fn((index: number) => rectList[index] ?? null);
  return rectList;
}

const mockDomRect = createMockDomRect();
const mockDomRectList = createMockDomRectList();

Object.defineProperty(document, "elementFromPoint", {
  writable: true,
  value: vi.fn(() => document.body),
});

Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  writable: true,
  value: vi.fn(() => mockDomRect),
});

Object.defineProperty(window.HTMLElement.prototype, "getClientRects", {
  writable: true,
  value: vi.fn(() => mockDomRectList),
});

Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  value: vi.fn(),
});

if (typeof window.Text !== "undefined") {
  Object.defineProperty(window.Text.prototype, "getBoundingClientRect", {
    writable: true,
    value: vi.fn(() => mockDomRect),
  });

  Object.defineProperty(window.Text.prototype, "getClientRects", {
    writable: true,
    value: vi.fn(() => mockDomRectList),
  });
}

if (typeof Range !== "undefined") {
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    writable: true,
    value: vi.fn(() => mockDomRect),
  });

  Object.defineProperty(Range.prototype, "getClientRects", {
    writable: true,
    value: vi.fn(() => mockDomRectList),
  });
}

beforeAll(async () => {
  await initializeI18n();
});

/**
 * Creates a platform mock for browser-focused tests.
 */
export function createMockPlatform() {
  return {
    getPlatform: vi.fn().mockReturnValue("web"),
    getDeviceId: vi.fn().mockResolvedValue("test-device-id"),
    setStorage: vi.fn().mockResolvedValue(undefined),
    getStorage: vi.fn().mockResolvedValue(null),
    removeStorage: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    readClipboard: vi.fn().mockResolvedValue(""),
    openExternal: vi.fn().mockResolvedValue(undefined),
    selectFile: vi.fn().mockResolvedValue([]),
    saveFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn().mockResolvedValue(undefined),
    minimizeWindow: vi.fn().mockResolvedValue(undefined),
    maximizeWindow: vi.fn().mockResolvedValue(undefined),
    closeWindow: vi.fn().mockResolvedValue(undefined),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
    createPty: vi.fn().mockResolvedValue(undefined),
    writePty: vi.fn().mockResolvedValue(undefined),
    resizePty: vi.fn().mockResolvedValue(undefined),
    destroyPty: vi.fn().mockResolvedValue(undefined),
    onPtyData: vi.fn().mockReturnValue(() => {}),
    showNotification: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn().mockReturnValue(true),
    onNetworkChange: vi.fn().mockReturnValue(() => {}),
  };
}

beforeEach(async () => {
  const { setAppLanguage } = await import("@sdkwork/openchat-pc-i18n");
  localStorageStore.set("openchat.locale", "en-US");
  await setAppLanguage("en-US");
});

afterEach(() => {
  localStorageStore.clear();
  localStorageStore.set("openchat.locale", "en-US");
  vi.clearAllMocks();
});
