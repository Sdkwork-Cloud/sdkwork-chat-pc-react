import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NearbyPage } from "@sdkwork/openchat-pc-nearby";

describe("NearbyPage desktop interactions", () => {
  it("filters nearby workspaces by max distance", () => {
    render(<NearbyPage />);

    const distanceSlider = screen.getByRole("slider");
    fireEvent.change(distanceSlider, { target: { value: "2" } });

    expect(screen.getAllByText("Shanghai AI Hub").length).toBeGreaterThan(0);
    expect(screen.queryByText("JingAn Product Lab")).not.toBeInTheDocument();
  });

  it("supports keyboard selection and route planning", () => {
    render(<NearbyPage />);

    const distanceSlider = screen.getByRole("slider");
    fireEvent.change(distanceSlider, { target: { value: "10" } });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { name: "JingAn Product Lab" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText((content) => content.includes("Planned route to JingAn Product Lab"))).toBeInTheDocument();
  });
});
