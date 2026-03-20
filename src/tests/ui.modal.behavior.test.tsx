import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "@sdkwork/openchat-pc-ui";

describe("shared modal foundation", () => {
  it("does not close on escape when escape closing is disabled", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} closeOnEscape={false} title="Memory dialog">
        <div>Dialog body</div>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("supports top placement and custom overlay classes", () => {
    const { container } = render(
      <Modal
        isOpen
        onClose={() => undefined}
        placement="top"
        overlayClassName="test-overlay"
        title="Search"
      >
        <div>Palette body</div>
      </Modal>,
    );

    expect(screen.getByText("Palette body")).toBeInTheDocument();
    const overlay = container.querySelector(".test-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay).toHaveClass("items-start");
  });
});
