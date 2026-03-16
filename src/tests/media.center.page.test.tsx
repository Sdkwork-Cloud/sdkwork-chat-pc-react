import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaCenterPage } from "@sdkwork/openchat-pc-media";

describe("MediaCenterPage desktop interactions", () => {
  it("supports playback and keyboard volume shortcuts", () => {
    render(<MediaCenterPage />);

    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("Playing")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("75%")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "-" });
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("filters channels by type", () => {
    render(<MediaCenterPage />);

    const typeSelect = screen.getByRole("combobox");
    fireEvent.change(typeSelect, { target: { value: "video" } });

    expect(screen.getAllByText("Creator Stream").length).toBeGreaterThan(0);
    expect(screen.queryByText("AI Daily Brief")).not.toBeInTheDocument();
  });
});
