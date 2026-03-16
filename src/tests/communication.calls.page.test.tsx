import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CallsPage } from "@sdkwork/openchat-pc-communication";

describe("CallsPage desktop interactions", () => {
  it("supports keyboard queue navigation and call actions", () => {
    render(
      <MemoryRouter>
        <CallsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Status: Connected")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByText("Status: Ringing")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText((content) => content.includes("Joined call"))).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "m" });
    expect(screen.getByRole("button", { name: "Unmute (M)" })).toBeInTheDocument();
  });

  it("filters queue by status", () => {
    render(
      <MemoryRouter>
        <CallsPage />
      </MemoryRouter>,
    );

    const statusSelect = screen.getByRole("combobox");
    fireEvent.change(statusSelect, { target: { value: "missed" } });

    expect(screen.getAllByText("Design Review Channel").length).toBeGreaterThan(0);
    expect(screen.queryByText("Support Queue #1")).not.toBeInTheDocument();
  });
});
