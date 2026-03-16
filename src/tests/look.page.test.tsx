import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LookPage } from "@sdkwork/openchat-pc-look";

describe("LookPage desktop interactions", () => {
  it("supports keyboard selection, apply action and preview scale shortcuts", () => {
    render(<LookPage />);

    expect(screen.getByRole("heading", { name: "Operator Console" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { name: "Creator Studio" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText((content) => content.includes('Applied preset "Creator Studio"'))).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("105%")).toBeInTheDocument();
  });

  it("filters look presets by keyword", () => {
    render(<LookPage />);

    const searchInput = screen.getByPlaceholderText("Search presets by title or theme");
    fireEvent.change(searchInput, { target: { value: "steel" } });

    expect(screen.getAllByText("Analytics Grid").length).toBeGreaterThan(0);
    expect(screen.queryByText("Creator Studio")).not.toBeInTheDocument();
  });
});
