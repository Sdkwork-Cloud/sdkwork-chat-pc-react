import { fireEvent, render, screen, within } from "@testing-library/react";
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
    render(
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
    const overlay = document.body.querySelector(".test-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay).toHaveClass("items-start");
  });

  it("renders outside transformed containers so dialogs stay centered instead of binding to the sidebar", () => {
    render(
      <div data-testid="sidebar-shell" style={{ transform: "translateX(24px)" }}>
        <Modal isOpen onClose={() => undefined} title="Create Group Chat">
          <div>Centered dialog body</div>
        </Modal>
      </div>,
    );

    const sidebarShell = screen.getByTestId("sidebar-shell");

    expect(screen.getByText("Centered dialog body")).toBeInTheDocument();
    expect(within(sidebarShell).queryByText("Centered dialog body")).not.toBeInTheDocument();
  });
});
