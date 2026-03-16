import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sdkwork/openchat-pc-discover", () => ({
  DiscoverResultService: {
    getFeed: vi.fn().mockResolvedValue({
      data: {
        content: [],
      },
    }),
  },
}));

import { ArticlesPage } from "@sdkwork/openchat-pc-content";

describe("ArticlesPage desktop interactions", () => {
  it("supports keyboard navigation and reading list shortcuts", async () => {
    render(<ArticlesPage />);
    await waitFor(() => {
      expect(screen.queryByText("Loading article feed...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search article title or source");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(searchInput).toHaveFocus();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { name: "Model Governance Checklist" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByRole("button", { name: "Remove From Reading List (L)" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText((content) => content.includes("Opened full article"))).toBeInTheDocument();
  });

  it("filters article list by keyword", async () => {
    render(<ArticlesPage />);
    await waitFor(() => {
      expect(screen.queryByText("Loading article feed...")).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search article title or source");
    fireEvent.change(searchInput, { target: { value: "governance" } });

    expect(screen.getAllByText("Model Governance Checklist").length).toBeGreaterThan(0);
    expect(screen.queryByText("Desktop Agent Workflow Tips")).not.toBeInTheDocument();
  });
});
