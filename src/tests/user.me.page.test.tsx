import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MePage } from "@sdkwork/openchat-pc-user";

describe("MePage desktop interactions", () => {
  it("supports keyboard search focus and opens selected quick action", () => {
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search quick action");

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(searchInput).toHaveFocus();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText((content) => content.includes("Opened Wallet."))).toBeInTheDocument();
  });

  it("filters quick actions by keyword", () => {
    render(
      <MemoryRouter>
        <MePage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search quick action");
    fireEvent.change(searchInput, { target: { value: "vip" } });

    expect(screen.getAllByText("VIP").length).toBeGreaterThan(0);
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });
});
