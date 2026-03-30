import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { getCategoriesMock, getSkillsMock, enableSkillMock, disableSkillMock } = vi.hoisted(
  () => ({
    getCategoriesMock: vi.fn(async () => ({
      success: true,
      data: [
        { id: "utility", name: "Utility", icon: "U" },
        { id: "developer", name: "Developer", icon: "D" },
      ],
    })),
    getSkillsMock: vi.fn(async () => ({
      success: true,
      data: [
        {
          id: "skill-alpha",
          name: "Alpha Skill",
          description: "Enabled and configured",
          icon: "A",
          category: "utility",
          version: "1.0.0",
          provider: "OpenChat",
          isPublic: true,
          isBuiltin: true,
          capabilities: ["alpha"],
          tags: ["fast"],
          usageCount: 1500,
          rating: 4.8,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-28T00:00:00.000Z",
          isEnabled: true,
          isConfigured: true,
        },
        {
          id: "skill-beta",
          name: "Beta Skill",
          description: "Disabled by default",
          icon: "B",
          category: "developer",
          version: "1.1.0",
          provider: "OpenChat",
          isPublic: true,
          isBuiltin: false,
          capabilities: ["beta"],
          tags: ["tooling"],
          usageCount: 900,
          rating: 4.6,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
          isEnabled: false,
          isConfigured: false,
        },
      ],
    })),
    enableSkillMock: vi.fn(async () => ({ success: true })),
    disableSkillMock: vi.fn(async () => ({ success: true })),
  }),
);

vi.mock("../../packages/sdkwork-openchat-pc-skill/src/services", () => ({
  SkillResultService: {
    getCategories: getCategoriesMock,
    getSkills: getSkillsMock,
    enableSkill: enableSkillMock,
    disableSkill: disableSkillMock,
  },
  SkillService: {
    getFavoriteSkillIds: () => [],
    getRecentSkillIds: () => [],
    markSkillOpened: (skillId: string) => [skillId],
    toggleFavoriteSkill: () => true,
  },
}));

import { SkillMarketPage } from "../../packages/sdkwork-openchat-pc-skill/src/pages/SkillMarketPage";

describe("skill market standard layout", () => {
  it("uses a compact market shell with tabs and filters instead of a hero sidebar layout", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SkillMarketPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getCategoriesMock).toHaveBeenCalledTimes(1);
      expect(getSkillsMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Enabled" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Disabled" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Needs config" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search skills...")).toBeInTheDocument();
    expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
    expect(screen.queryByText("Skill Preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Curated Skills")).not.toBeInTheDocument();
    expect(screen.queryByText("Recently used")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Build a clear Discover, Enable, Configure workflow for reusable skill capabilities."),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Alpha Skill")).toBeInTheDocument();
    expect(screen.getByText("Beta Skill")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Enabled" }));

    expect(screen.getByRole("tab", { name: "Enabled" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Alpha Skill")).toBeInTheDocument();
    expect(screen.queryByText("Beta Skill")).not.toBeInTheDocument();
  });
});
