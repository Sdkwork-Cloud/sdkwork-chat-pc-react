import { describe, expect, it } from "vitest";

import {
  DEFAULT_RTC_CONFIG,
  RTCSDKFactory,
} from "../../packages/sdkwork-openchat-pc-rtc/src/services/sdk-adapter";

describe("rtc default provider", () => {
  it("defaults the desktop rtc provider to volcengine", () => {
    expect(RTCSDKFactory.getDefaultProvider()).toBe("volcengine");
    expect(DEFAULT_RTC_CONFIG.provider).toBe("volcengine");
  });
});
