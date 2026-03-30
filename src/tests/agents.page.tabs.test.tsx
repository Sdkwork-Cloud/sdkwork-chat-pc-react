import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { fixtureAgents, getAgentsMock } = vi.hoisted(() => {
  const agents = [
    {
      id: "agent-public",
      uuid: "agent-public",
      name: "Public Ops Agent",
      description: "Shared workspace helper",
      avatar: "OP",
      type: "assistant",
      status: "ready",
      config: {
        category: "business",
        tags: ["ops"],
        rating: 4.8,
        usageCount: 2200,
        creator: "OpenChat",
      },
      ownerId: "workspace-owner",
      isPublic: true,
      isDeleted: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "agent-mine",
      uuid: "agent-mine",
      name: "My Draft Agent",
      description: "Created by current user",
      avatar: "ME",
      type: "assistant",
      status: "chatting",
      config: {
        category: "productivity",
        tags: ["draft"],
        rating: 4.9,
        usageCount: 350,
        creator: "You",
      },
      ownerId: "current-user",
      isPublic: true,
      isDeleted: false,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    },
  ];

  return {
    fixtureAgents: agents,
    getAgentsMock: vi.fn(async () => ({
      success: true,
      data: {
        agents,
        total: agents.length,
      },
    })),
  };
});

const createAgentMock = vi.hoisted(() =>
  vi.fn(async (request: { name: string; description?: string }) => ({
    success: true,
    data: {
      id: `created-${request.name.toLowerCase().replace(/\s+/g, "-")}`,
      uuid: `created-${request.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: request.name,
      description: request.description || "Created from the market page",
      avatar: "CR",
      type: "assistant",
      status: "ready",
      config: {
        category: "productivity",
        tags: ["new"],
        rating: 5,
        usageCount: 0,
        creator: "You",
      },
      ownerId: "current-user",
      isPublic: true,
      isDeleted: false,
      createdAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    },
  })),
);

vi.mock("../../packages/sdkwork-openchat-pc-agent/src/services", () => ({
  AgentResultService: {
    getAgents: getAgentsMock,
    createAgent: createAgentMock,
  },
  AgentService: {
    getFavoriteAgentIds: () => [],
    getRecentAgentIds: () => [],
    toggleFavoriteAgent: () => true,
    markAgentOpened: (agentId: string) => [agentId],
  },
}));

import { AgentMarketPage } from "../../packages/sdkwork-openchat-pc-agent/src/pages/AgentMarketPage";

describe("agents page tabs", () => {
  it("switches agent classifications through top tabs", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentMarketPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAgentsMock).toHaveBeenCalledTimes(1);
    });

    const allTab = screen.getByRole("tab", { name: "All agents" });
    const mineTab = screen.getByRole("tab", { name: "My agents" });
    const searchInput = screen.getByPlaceholderText("Search by name, description, or tags");
    const createButton = screen.getByRole("button", { name: "Create" });
    const results = screen.getByTestId("agents-market-results");

    expect(searchInput).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
    expect(
      screen.queryByText("Discover, compare, and launch specialized agents with a desktop-first control panel."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Today Focus")).not.toBeInTheDocument();
    expect(screen.queryByText("Live Preview")).not.toBeInTheDocument();
    expect(allTab).toHaveAttribute("aria-selected", "true");
    expect(within(results).getByText("Public Ops Agent")).toBeInTheDocument();
    expect(within(results).getByText("My Draft Agent")).toBeInTheDocument();

    await user.click(mineTab);

    expect(mineTab).toHaveAttribute("aria-selected", "true");
    expect(allTab).toHaveAttribute("aria-selected", "false");
    expect(within(results).getByText("My Draft Agent")).toBeInTheDocument();
    expect(within(results).queryByText("Public Ops Agent")).not.toBeInTheDocument();
  });

  it("opens a compact create flow from the top bar without showing a hero header", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentMarketPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getAgentsMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Discover, compare, and launch specialized agents with a desktop-first control panel.")).not.toBeInTheDocument();
    expect(screen.queryByText("Today Focus")).not.toBeInTheDocument();
    expect(screen.queryByText("Live Preview")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create" }));

    const dialog = screen.getByRole("dialog", { name: "Create" });
    await user.type(within(dialog).getByLabelText("Name"), "Workflow Agent");
    await user.type(within(dialog).getByLabelText("Description"), "Organizes repetitive workflows");
    await user.type(within(dialog).getByLabelText("Tags"), "workflow, automation");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createAgentMock).toHaveBeenCalledTimes(1);
    });

    const results = screen.getByTestId("agents-market-results");
    expect(within(results).getByText("Workflow Agent")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Create" })).not.toBeInTheDocument();
  });
});
