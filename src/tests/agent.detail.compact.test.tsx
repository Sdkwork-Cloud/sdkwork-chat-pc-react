import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { getAgentMock, getAgentStatsMock, getAgentSessionsMock, markAgentOpenedMock } = vi.hoisted(
  () => ({
    getAgentMock: vi.fn(async () => ({
      success: true,
      data: {
        id: "agent-1",
        uuid: "agent-1",
        name: "Compact Agent",
        description: "This hero text should no longer appear.",
        avatar: "CA",
        type: "assistant",
        status: "ready",
        config: {
          category: "productivity",
          tags: ["compact"],
          creator: "You",
        },
        ownerId: "current-user",
        isPublic: true,
        isDeleted: false,
        createdAt: "2026-03-28T00:00:00.000Z",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    })),
    getAgentStatsMock: vi.fn(async () => ({
      success: true,
      data: {
        totalSessions: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        satisfactionRate: 0,
        todayUsage: 0,
        weeklyUsage: 0,
        averageRating: 0,
        favoriteCount: 0,
      },
    })),
    getAgentSessionsMock: vi.fn(async () => ({
      success: true,
      data: [],
    })),
    markAgentOpenedMock: vi.fn(),
  }),
);

vi.mock("../../packages/sdkwork-openchat-pc-agent/src/services", () => ({
  AgentResultService: {
    getAgent: getAgentMock,
    getAgentStats: getAgentStatsMock,
    getAgentSessions: getAgentSessionsMock,
    createSession: vi.fn(),
    resetAgent: vi.fn(),
  },
  AgentService: {
    markAgentOpened: markAgentOpenedMock,
  },
}));

vi.mock("../../packages/sdkwork-openchat-pc-agent/src/components/AgentChat", () => ({
  AgentChat: () => <div data-testid="agent-chat" />,
}));

vi.mock("../../packages/sdkwork-openchat-pc-agent/src/components/MemoryPanel", () => ({
  MemoryPanel: () => <div data-testid="memory-panel" />,
}));

import { AgentDetailPage } from "../../packages/sdkwork-openchat-pc-agent/src/pages/AgentDetailPage";

describe("agent detail page compact layout", () => {
  it("keeps tabs visible without restoring a hero block", async () => {
    render(
      <MemoryRouter initialEntries={["/agents/agent-1"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/agents/:id" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAgentMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: /Back to Agent Market/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Live Chat/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Memory/ })).toBeInTheDocument();
    expect(screen.queryByText("This hero text should no longer appear.")).not.toBeInTheDocument();
  });
});
