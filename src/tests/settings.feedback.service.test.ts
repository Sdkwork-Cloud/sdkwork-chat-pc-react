import { beforeEach, describe, expect, it, vi } from "vitest";

const submitSpy = vi.fn();
const getSupportInfoSpy = vi.fn();

vi.mock("@sdkwork/openchat-pc-kernel", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-kernel")>(
    "@sdkwork/openchat-pc-kernel",
  );

  return {
    ...actual,
    getAppSdkClientWithSession: vi.fn(() => ({
      feedback: {
        submit: submitSpy,
        getSupportInfo: getSupportInfoSpy,
      },
    })),
  };
});

import { FeedbackService } from "@sdkwork/openchat-pc-settings";

describe("FeedbackService integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitSpy.mockReset();
    getSupportInfoSpy.mockReset();
  });

  it("submits feedback via feedback endpoint", async () => {
    submitSpy.mockResolvedValue({
      data: {
        id: "fb_123",
        type: "bug",
        content: "sidebar overflows on small screens",
        status: "submitted",
        submitTime: "2026-03-03T12:00:00.000Z",
      },
      code: "2000",
      msg: "SUCCESS",
      requestId: "req_1",
      errorName: "SUCCESS",
    } as never);

    const result = await FeedbackService.submitFeedback({
      type: "bug",
      content: "sidebar overflows on small screens",
      contact: "qa@example.com",
    });

    expect(submitSpy).toHaveBeenCalledWith({
      type: "bug",
      content: "sidebar overflows on small screens",
      contact: "qa@example.com",
    });
    expect(result.id).toBe("fb_123");
    expect(result.status).toBe("submitted");
  });

  it("loads feedback support info from support endpoint", async () => {
    getSupportInfoSpy.mockResolvedValue({
      data: {
        hotline: "400-800-8888",
        email: "support@example.com",
        workingHours: "Mon-Fri 09:00-18:00",
      },
      code: "2000",
      msg: "SUCCESS",
      requestId: "req_2",
      errorName: "SUCCESS",
    } as never);

    const result = await FeedbackService.getFeedbackSupportInfo();

    expect(getSupportInfoSpy).toHaveBeenCalledTimes(1);
    expect(result.email).toBe("support@example.com");
    expect(result.hotline).toBe("400-800-8888");
  });
});
