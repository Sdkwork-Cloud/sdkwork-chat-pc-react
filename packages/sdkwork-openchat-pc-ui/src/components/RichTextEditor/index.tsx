import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("python", python);
lowlight.register("css", css);
lowlight.register("json", json);
lowlight.register("bash", bash);

const mentionSuggestions = [
  "OpenChat AI",
  "Code assistant",
  "Data assistant",
  "Design assistant",
];

function buildInsertContent(content: string) {
  const normalizedContent = content.replace(/\r\n?/g, "\n");
  if (!normalizedContent.includes("\n")) {
    return normalizedContent;
  }

  return normalizedContent.split("\n").map((line) =>
    line
      ? {
          type: "paragraph",
          content: [{ type: "text", text: line }],
        }
      : {
          type: "paragraph",
        },
  );
}

function getEditorText(editor: Editor | null | undefined): string {
  return editor?.getText({ blockSeparator: "\n" }) ?? "";
}

function insertPlainText(editor: Editor | null | undefined, content: string): void {
  if (!editor || !content) {
    return;
  }

  editor.chain().focus().insertContent(buildInsertContent(content)).run();
}

export interface RichTextEditorProps {
  placeholder?: string;
  ariaLabel?: string;
  onChange?: (html: string, text: string) => void;
  onSubmit?: () => void;
  initialContent?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
  variant?: "default" | "composer";
  showToolbar?: boolean;
  submitOnEnter?: boolean;
  footer?: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  resizable?: boolean;
  maxResizableHeight?: number;
}

export interface RichTextEditorRef {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  focus: () => void;
  insertContent: (content: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      placeholder,
      ariaLabel,
      onChange,
      onSubmit,
      initialContent = "",
      disabled = false,
      maxHeight = 220,
      minHeight = 60,
      variant = "default",
      showToolbar,
      submitOnEnter = false,
      footer,
      containerClassName = "",
      contentClassName = "",
      resizable = variant === "composer",
      maxResizableHeight,
    },
    ref,
  ) => {
    const { tr } = useAppTranslation();
    const [isFocused, setIsFocused] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isResizeHandleHovered, setIsResizeHandleHovered] = useState(false);
    const [activeComposerHeight, setActiveComposerHeight] = useState<number | null>(null);
    const [composerResizeLimit, setComposerResizeLimit] = useState(maxHeight);
    const shellRef = useRef<HTMLDivElement | null>(null);
    const scrollRegionRef = useRef<HTMLDivElement | null>(null);
    const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
    const resizeSessionRef = useRef<{
      startY: number;
      startHeight: number;
      maxHeight: number;
      pointerId: number | null;
    } | null>(null);

    const resolvedPlaceholder = placeholder ?? tr("Type a message...");
    const resolvedAriaLabel = ariaLabel ?? resolvedPlaceholder;
    const showFormattingToolbar = showToolbar ?? variant === "default";
    const isComposer = variant === "composer";

    function resolveAvailableComposerHeight() {
      if (typeof window === "undefined") {
        return Math.max(minHeight, maxHeight);
      }

      const shellRect = shellRef.current?.getBoundingClientRect();
      const scrollRegionHeight = scrollRegionRef.current?.getBoundingClientRect().height ?? 0;
      const chromeHeight = shellRect
        ? Math.max(Math.ceil(shellRect.height - scrollRegionHeight), 0)
        : 0;
      const viewportLimit = Math.max(minHeight, Math.floor(window.innerHeight - 180 - chromeHeight));
      const shellLimit = shellRect && shellRect.bottom > 0
        ? Math.max(minHeight, Math.floor(shellRect.bottom - 72 - chromeHeight))
        : viewportLimit;
      const explicitLimit = maxResizableHeight ?? Number.POSITIVE_INFINITY;

      return Math.max(minHeight, Math.min(explicitLimit, shellLimit, viewportLimit));
    }

    function clampComposerHeight(nextHeight: number, limit = resolveAvailableComposerHeight()) {
      return Math.max(minHeight, Math.min(nextHeight, limit));
    }

    function stopResize(pointerId?: number | null) {
      const currentSession = resizeSessionRef.current;
      if (!currentSession) {
        return;
      }

      if (
        typeof pointerId === "number" &&
        currentSession.pointerId !== null &&
        currentSession.pointerId !== pointerId
      ) {
        return;
      }

      const activeHandle = resizeHandleRef.current;
      if (
        activeHandle &&
        currentSession.pointerId !== null &&
        typeof activeHandle.hasPointerCapture === "function" &&
        activeHandle.hasPointerCapture(currentSession.pointerId)
      ) {
        activeHandle.releasePointerCapture(currentSession.pointerId);
      }

      resizeSessionRef.current = null;
      resizeHandleRef.current = null;
      setIsResizing(false);
      setIsResizeHandleHovered(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    function handleResizeHoverChange(isHovered: boolean) {
      if (!isComposer || !resizable || disabled || resizeSessionRef.current) {
        return;
      }
      setIsResizeHandleHovered(isHovered);
    }

    function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
      if (!isComposer || !resizable || disabled) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      resizeHandleRef.current = event.currentTarget;
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      resizeSessionRef.current = {
        startY: event.clientY,
        startHeight: Math.max(
          minHeight,
          Math.round(
            activeComposerHeight ??
              scrollRegionRef.current?.getBoundingClientRect().height ??
              minHeight,
          ),
        ),
        maxHeight: resolveAvailableComposerHeight(),
        pointerId: event.pointerId,
      };

      setIsResizing(true);
      setIsResizeHandleHovered(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
    }

    const editor = useEditor({
      immediatelyRender: true,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: "javascript",
        }),
        Placeholder.configure({
          placeholder: resolvedPlaceholder,
          emptyEditorClass: "is-editor-empty",
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            items: ({ query }) =>
              mentionSuggestions
                .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
                .slice(0, 5),
            render: () => ({
              onStart: () => undefined,
              onUpdate: () => undefined,
              onKeyDown: () => false,
              onExit: () => undefined,
            }),
          },
        }),
      ],
      content: initialContent,
      editable: !disabled,
      onUpdate: ({ editor: currentEditor }) => {
        onChange?.(currentEditor.getHTML(), getEditorText(currentEditor));
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-label": resolvedAriaLabel,
          "aria-multiline": "true",
          class: [
            variant === "composer" ? "chat-composer-editor" : "rich-text-editor",
            "max-w-none break-words text-[15px] leading-6 text-text-primary focus:outline-none",
          ].join(" "),
          style: `min-height:${minHeight}px`,
        },
        handleKeyDown: (_view, event) => {
          if (
            submitOnEnter &&
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.isComposing
          ) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }

          return false;
        },
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
      if (!isComposer || !resizable) {
        return;
      }

      const syncComposerHeight = () => {
        const nextLimit = resolveAvailableComposerHeight();
        setComposerResizeLimit(nextLimit);
        setActiveComposerHeight((previous) =>
          previous === null ? null : clampComposerHeight(previous, nextLimit),
        );
      };

      syncComposerHeight();
      window.addEventListener("resize", syncComposerHeight);

      return () => {
        window.removeEventListener("resize", syncComposerHeight);
      };
    }, [isComposer, maxResizableHeight, maxHeight, minHeight, resizable]);

    useEffect(() => {
      if (!isComposer || !resizable || typeof ResizeObserver === "undefined" || !shellRef.current) {
        return;
      }

      const observer = new ResizeObserver(() => {
        const nextLimit = resolveAvailableComposerHeight();
        setComposerResizeLimit(nextLimit);
        setActiveComposerHeight((previous) =>
          previous === null ? null : clampComposerHeight(previous, nextLimit),
        );
      });

      observer.observe(shellRef.current);

      return () => {
        observer.disconnect();
      };
    }, [isComposer, maxResizableHeight, maxHeight, minHeight, resizable]);

    useEffect(() => {
      if (!isComposer || !resizable) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => {
        const currentSession = resizeSessionRef.current;
        if (!currentSession) {
          return;
        }

        if (currentSession.pointerId !== null && currentSession.pointerId !== event.pointerId) {
          return;
        }

        const nextHeight = currentSession.startHeight + (currentSession.startY - event.clientY);
        setActiveComposerHeight(
          Math.max(minHeight, Math.min(Math.round(nextHeight), currentSession.maxHeight)),
        );
      };

      const handlePointerStop = (event: PointerEvent) => {
        stopResize(event.pointerId);
      };

      const handleWindowBlur = () => {
        stopResize();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerStop);
      window.addEventListener("pointercancel", handlePointerStop);
      window.addEventListener("blur", handleWindowBlur);

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerStop);
        window.removeEventListener("pointercancel", handlePointerStop);
        window.removeEventListener("blur", handleWindowBlur);
        stopResize();
      };
    }, [isComposer, minHeight, resizable]);

    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || "",
        getText: () => getEditorText(editor),
        clear: () => editor?.commands.clearContent(),
        focus: () => editor?.commands.focus(),
        insertContent: (content: string) => insertPlainText(editor, content),
      }),
      [editor],
    );

    if (!editor) {
      return null;
    }

    const composerAutoMaxHeight = Math.max(minHeight, Math.min(maxHeight, composerResizeLimit));
    const composerScrollStyle = isComposer
      ? {
          height: activeComposerHeight ?? undefined,
          maxHeight: activeComposerHeight === null ? composerAutoMaxHeight : composerResizeLimit,
        }
      : { maxHeight };

    return (
      <div
        ref={shellRef}
        data-disabled={disabled ? "true" : "false"}
        data-focused={isFocused ? "true" : "false"}
        data-variant={variant}
        className={[
          "relative w-full rounded-[18px] transition-all duration-200",
          isComposer ? "chat-composer-shell" : "rich-text-shell border",
          disabled ? "cursor-not-allowed opacity-60" : "",
          containerClassName,
        ].join(" ")}
      >
        {isComposer && resizable ? (
          <button
            type="button"
            aria-label={tr("Resize composer")}
            data-testid="chat-composer-resize-handle"
            data-hovered={isResizeHandleHovered ? "true" : "false"}
            data-resizing={isResizing ? "true" : "false"}
            onPointerEnter={() => handleResizeHoverChange(true)}
            onPointerLeave={() => handleResizeHoverChange(false)}
            onFocus={() => handleResizeHoverChange(true)}
            onBlur={() => handleResizeHoverChange(false)}
            onPointerDown={handleResizeStart}
            className="chat-composer-resize-handle"
          >
            <span className="chat-composer-resize-affordance">
              <span className="chat-composer-resize-grip" />
            </span>
          </button>
        ) : null}

        {showFormattingToolbar ? (
          <div className="flex items-center border-b border-border bg-bg-secondary/60 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title={tr("Bold")}
              >
                <BoldIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title={tr("Italic")}
              >
                <ItalicIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive("code")}
                title={tr("Inline code")}
              >
                <InlineCodeIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive("codeBlock")}
                title={tr("Code block")}
              >
                <CodeBlockIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                title={tr("Bulleted list")}
              >
                <BulletListIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                title={tr("Numbered list")}
              >
                <OrderedListIcon />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                title={tr("Quote")}
              >
                <QuoteIcon />
              </ToolbarButton>
            </div>
          </div>
        ) : null}

        <div
          ref={scrollRegionRef}
          data-testid={isComposer ? "chat-composer-scroll-region" : undefined}
          className={[
            "overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted",
            isComposer ? "px-[5px] pb-2 pt-2.5 sm:px-[5px] sm:pt-2.5" : "px-4 py-3",
            contentClassName,
          ].join(" ")}
          style={composerScrollStyle}
        >
          <EditorContent editor={editor} />
        </div>

        {footer ? (
          <div
            className={
              isComposer
                ? "chat-composer-footer px-[5px] pb-[5px] pt-2.5 sm:px-[5px] sm:pb-[5px]"
                : "border-t border-border/80 px-4 pb-4 pt-3"
            }
          >
            {footer}
          </div>
        ) : null}
      </div>
    );
  },
);

RichTextEditor.displayName = "RichTextEditor";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-all duration-200 ${
        isActive
          ? "scale-110 bg-primary/10 text-primary shadow-sm"
          : "text-text-tertiary hover:bg-bg-hover hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function BoldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 4h6M4 20h6m5-16l-6 16"
      />
    </svg>
  );
}

function InlineCodeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="m8 9-4 3 4 3m8-6 4 3-4 3"
      />
    </svg>
  );
}

function CodeBlockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 8 4 12l4 4m8-8 4 4-4 4M14 4l-4 16"
      />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
      />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6h10M10 12h10M10 18h10M4 6h1v4M4 10h2M4 16h1a1 1 0 011 1v1H4m0 0h3"
      />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 11H6a2 2 0 0 1 2-2V7a4 4 0 0 0-4 4v6h6v-6Zm10 0h-4a2 2 0 0 1 2-2V7a4 4 0 0 0-4 4v6h6v-6Z"
      />
    </svg>
  );
}

export default RichTextEditor;
