import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "../../packages/sdkwork-openchat-pc-im/src/components/ChatInput";

describe("chat composer", () => {
  beforeEach(() => {
    vi.mocked(window.URL.createObjectURL).mockReturnValue("blob:chat-composer-preview");
  });

  it("renders a tiptap-driven composer with a bottom action bar and supports enter-to-send", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} />);

    const editor = screen.getByRole("textbox", { name: "Type a message..." });
    const actionBar = screen.getByTestId("chat-composer-actions");

    expect(within(actionBar).getByRole("button", { name: "Files" })).toBeInTheDocument();
    expect(within(actionBar).getByRole("button", { name: "Emoji" })).toBeInTheDocument();
    expect(within(actionBar).getByRole("button", { name: "Screenshot" })).toBeInTheDocument();
    expect(within(actionBar).getByRole("button", { name: "Code block" })).toBeInTheDocument();
    expect(within(actionBar).getByRole("button", { name: "@ mention" })).toBeInTheDocument();

    await user.type(editor, "Hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}world");
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toMatch(/^Hello\s+world$/);
    expect(onSend.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("keeps attachments in the composer and inserts emojis from the bottom action row", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { container } = render(<ChatInput onSend={onSend} />);

    const editor = screen.getByRole("textbox", { name: "Type a message..." });
    await user.type(editor, "Hi ");

    await user.click(screen.getByRole("button", { name: "Emoji" }));
    expect(screen.getByPlaceholderText("Search emojis...")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "grinning" }));

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    const file = new File(["preview"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [file],
      },
    });

    expect(screen.getByText("avatar.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toContain("Hi");
    expect(onSend.mock.calls[0]?.[0]).toContain("😀");
    expect(onSend.mock.calls[0]?.[1]).toHaveLength(1);
    expect(onSend.mock.calls[0]?.[1]?.[0]?.name).toBe("avatar.png");
  });
  it("uses an adaptive width lane and a theme-ready composer shell", () => {
    render(<ChatInput onSend={vi.fn()} />);

    const lane = screen.getByTestId("chat-composer-lane");
    const editor = screen.getByRole("textbox", { name: "Type a message..." });
    const shell = editor.closest(".chat-composer-shell");

    expect(lane.className).not.toContain("max-w-4xl");
    expect(lane.className).toContain("w-full");
    expect(shell).toBeTruthy();
    expect(shell?.classList.contains("border")).toBe(false);
  });

  it("uses a hover-only top-edge resize hotspot and supports pointer drag resize", () => {
    render(<ChatInput onSend={vi.fn()} />);

    const handle = screen.getByTestId("chat-composer-resize-handle");
    const scrollRegion = screen.getByTestId("chat-composer-scroll-region");

    expect(screen.queryByText("Drag to resize")).not.toBeInTheDocument();
    expect(handle).toHaveAttribute("data-hovered", "false");
    expect(handle).toHaveAttribute("data-resizing", "false");
    expect(scrollRegion.style.height).toBe("");
    expect(scrollRegion).toHaveStyle({ maxHeight: "280px" });

    fireEvent.pointerEnter(handle, { pointerType: "mouse" });
    expect(handle).toHaveAttribute("data-hovered", "true");
    fireEvent.pointerLeave(handle, { pointerType: "mouse" });
    expect(handle).toHaveAttribute("data-hovered", "false");

    fireEvent.pointerDown(handle, { clientY: 420, pointerId: 1, button: 0 });
    expect(handle).toHaveAttribute("data-resizing", "true");
    fireEvent.pointerMove(window, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 300, pointerId: 1 });

    expect(handle).toHaveAttribute("data-resizing", "false");
    expect(Number.parseInt(scrollRegion.style.height, 10)).toBeGreaterThan(112);

    fireEvent.pointerDown(handle, { clientY: 420, pointerId: 2, button: 0 });
    fireEvent.pointerMove(window, { clientY: -4000, pointerId: 2 });
    fireEvent.pointerUp(window, { clientY: -4000, pointerId: 2 });

    expect(Number.parseInt(scrollRegion.style.height, 10)).toBeLessThanOrEqual(
      window.innerHeight - 180,
    );
  });
});
