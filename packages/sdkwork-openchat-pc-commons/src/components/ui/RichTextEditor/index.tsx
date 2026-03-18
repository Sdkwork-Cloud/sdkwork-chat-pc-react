import { forwardRef, useImperativeHandle, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
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

export interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  onSubmit?: () => void;
  initialContent?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
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
      onChange,
      onSubmit,
      initialContent = "",
      disabled = false,
      maxHeight = 200,
      minHeight = 60,
    },
    ref,
  ) => {
    const { tr } = useAppTranslation();
    const [isFocused, setIsFocused] = useState(false);
    const resolvedPlaceholder = placeholder ?? tr("Type a message...");

    const editor = useEditor({
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
              ["OpenChat AI", "Code assistant", "Data assistant", "Design assistant"]
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
        onChange?.(currentEditor.getHTML(), currentEditor.getText());
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      editorProps: {
        attributes: {
          class: "prose prose-invert max-w-none focus:outline-none",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }

          return false;
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || "",
        getText: () => editor?.getText() || "",
        clear: () => editor?.commands.clearContent(),
        focus: () => editor?.commands.focus(),
        insertContent: (content: string) => editor?.commands.insertContent(content),
      }),
      [editor],
    );

    if (!editor) {
      return null;
    }

    return (
      <div
        className={`relative w-full rounded-2xl border bg-bg-tertiary transition-all duration-300 ${
          isFocused
            ? "border-primary ring-2 ring-primary/20 shadow-glow-primary"
            : "border-border"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        style={{ minHeight, maxHeight }}
      >
        <div className="flex items-center border-b border-border bg-bg-secondary/50 px-3 py-2 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center space-x-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title={tr("Bold")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title={tr("Italic")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              title={tr("Inline code")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              title={tr("Code block")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title={tr("Bulleted list")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title={tr("Numbered list")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01"
                />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title={tr("Quote")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            </ToolbarButton>
          </div>
        </div>

        <div
          className="overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted"
          style={{ maxHeight: maxHeight - 45 }}
        >
          <EditorContent
            editor={editor}
            className="px-4 py-3 text-sm font-medium leading-relaxed text-text-primary"
          />
        </div>
      </div>
    );
  },
);

RichTextEditor.displayName = "RichTextEditor";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 transition-all duration-200 ${
        isActive
          ? "scale-110 bg-primary-soft text-primary shadow-sm"
          : "text-text-tertiary hover:bg-bg-hover hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export default RichTextEditor;
