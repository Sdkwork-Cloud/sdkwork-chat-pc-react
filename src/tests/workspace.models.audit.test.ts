import { describe, expect, it } from "vitest";
import {
  buildCallQueueSummary,
  filterCallQueue,
} from "@sdkwork/openchat-pc-communication";
import {
  buildArticleWorkspaceSummary,
  filterArticleWorkspace,
} from "@sdkwork/openchat-pc-content";
import {
  buildLookWorkspaceSummary,
  filterLookWorkspace,
} from "@sdkwork/openchat-pc-look";
import {
  buildMediaWorkspaceSummary,
  filterMediaWorkspace,
} from "@sdkwork/openchat-pc-media";
import {
  buildNearbyWorkspaceSummary,
  filterNearbyWorkspace,
} from "@sdkwork/openchat-pc-nearby";
import {
  buildMeWorkspaceSummary,
  filterQuickActions,
} from "@sdkwork/openchat-pc-user";

describe("workspace model readiness", () => {
  it("supports communication queue summaries and filtering", () => {
    const calls = [
      { id: "1", target: "Alpha", direction: "inbound", status: "ringing", startedAt: "2026-03-01", quality: "good" },
      { id: "2", target: "Beta", direction: "outbound", status: "connected", startedAt: "2026-03-01", quality: "excellent" },
    ] as const;

    expect(buildCallQueueSummary(calls)).toMatchObject({ total: 2, ringing: 1, connected: 1, missed: 0 });
    expect(filterCallQueue(calls, { keyword: "beta", status: "all" })).toHaveLength(1);
  });

  it("supports content article summaries and filtering", () => {
    const articles = [
      { id: "1", title: "Agent Ops", summary: "Routing", source: "OpenChat", readCount: 100, publishedAt: "2026-03-01" },
      { id: "2", title: "Model Guard", summary: "Safety", source: "AI Team", readCount: 40, publishedAt: "2026-03-02" },
    ];

    expect(buildArticleWorkspaceSummary(articles)).toMatchObject({ total: 2, totalReads: 140, maxRead: 100 });
    expect(filterArticleWorkspace(articles, "guard")).toHaveLength(1);
  });

  it("supports look preset summaries and filtering", () => {
    const presets = [
      { id: "1", title: "Operator", theme: "Graphite", palette: "#111", usage: "Ops" },
      { id: "2", title: "Studio", theme: "Sand", palette: "#fff", usage: "Create" },
    ];

    expect(buildLookWorkspaceSummary(presets)).toMatchObject({ total: 2, themes: 2 });
    expect(filterLookWorkspace(presets, "sand")).toHaveLength(1);
  });

  it("supports media summaries and filtering", () => {
    const channels = [
      { id: "1", name: "Daily", type: "audio", nowPlaying: "A", audience: 10 },
      { id: "2", name: "Live", type: "video", nowPlaying: "B", audience: 30 },
    ] as const;

    expect(buildMediaWorkspaceSummary(channels)).toMatchObject({ total: 2, audio: 1, video: 1, podcast: 0, audience: 40 });
    expect(filterMediaWorkspace(channels, { keyword: "live", type: "all" })).toHaveLength(1);
  });

  it("supports nearby workspace summaries and filtering", () => {
    const spaces = [
      { id: "1", name: "Hub", distanceKm: 1.2, category: "Coworking", activity: "Review", membersOnline: 4 },
      { id: "2", name: "Lab", distanceKm: 6.5, category: "Center", activity: "Meetup", membersOnline: 8 },
    ];

    expect(buildNearbyWorkspaceSummary(spaces)).toMatchObject({ total: 2, onlineCount: 12, nearest: 1.2, farthest: 6.5 });
    expect(filterNearbyWorkspace(spaces, { keyword: "", maxDistanceKm: 2 })).toHaveLength(1);
  });

  it("supports me quick action summaries and filtering", () => {
    const actions = [
      { id: "settings", label: "Settings", path: "/settings", desc: "Prefs" },
      { id: "wallet", label: "Wallet", path: "/wallet", desc: "Balance" },
    ];

    expect(buildMeWorkspaceSummary(actions)).toMatchObject({ total: 2 });
    expect(filterQuickActions(actions, "wallet")).toHaveLength(1);
  });
});
