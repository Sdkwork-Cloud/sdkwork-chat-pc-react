import { describe, expect, it } from "vitest";

import { createRTCSDK } from "../../packages/sdkwork-openchat-pc-rtc/src/services/sdk-adapter";

describe("rtc tencent adapter", () => {
  it("fails fast when the TRTC runtime is unavailable", async () => {
    const rtcSdk = createRTCSDK({
      provider: "tencentcloud",
      appId: "tx-app-1",
    });

    await expect(rtcSdk.init({
      provider: "tencentcloud",
      appId: "tx-app-1",
    })).rejects.toThrow(/TRTC|Tencent|not found|unavailable/i);
  });
});
