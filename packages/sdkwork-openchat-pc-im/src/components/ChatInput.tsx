import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import {
  EmojiPicker,
  RichTextEditor,
  type RichTextEditorRef,
} from "@sdkwork/openchat-pc-ui";
import { requestDisplayCaptureStream } from "@sdkwork/openchat-pc-rtc";
import { formatNumber, useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

export type { RichTextEditorRef } from "@sdkwork/openchat-pc-ui";

export interface MediaItem {
  id: string;
  type: "image" | "video" | "file";
  url: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  duration?: number;
}

interface ChatInputProps {
  editorRef?: RefObject<RichTextEditorRef>;
  onSend: (content: string, attachments?: MediaItem[]) => void;
  disabled?: boolean;
}

function createObjectUrl(file: Blob): string {
  return URL.createObjectURL(file);
}

function revokeObjectUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function createMediaId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${formatNumber(size, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

function getAttachmentType(file: File): MediaItem["type"] {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return "file";
}

function getAttachmentTypeLabel(
  attachment: MediaItem,
  tr: ReturnType<typeof useAppTranslation>["tr"],
): string {
  if (attachment.type === "image") {
    return tr("Image");
  }
  if (attachment.type === "video") {
    return tr("Video file");
  }
  return tr("File");
}

export const ChatInput = memo(function ChatInput({
  editorRef,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const { tr } = useAppTranslation();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<RichTextEditorRef>(null);
  const emojiAnchorRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const hasContent = draft.trim().length > 0 || attachments.length > 0;

  const releaseAttachmentUrl = useCallback((url: string) => {
    revokeObjectUrl(url);
    objectUrlsRef.current.delete(url);
  }, []);

  const clearAllAttachments = useCallback(() => {
    setAttachments((previous) => {
      previous.forEach((item) => releaseAttachmentUrl(item.url));
      return [];
    });
  }, [releaseAttachmentUrl]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => revokeObjectUrl(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) {
      return;
    }

    const nextItems = fileArray.map((file) => {
      const url = createObjectUrl(file);
      objectUrlsRef.current.add(url);

      return {
        id: createMediaId(),
        type: getAttachmentType(file),
        url,
        name: file.name,
        size: file.size,
      } satisfies MediaItem;
    });

    setAttachments((previous) => [...previous, ...nextItems]);
  }, []);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((previous) => {
        const target = previous.find((item) => item.id === id);
        if (target) {
          releaseAttachmentUrl(target.url);
        }
        return previous.filter((item) => item.id !== id);
      });
    },
    [releaseAttachmentUrl],
  );

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) {
        return;
      }
      addFiles(event.target.files);
      event.target.value = "";
    },
    [addFiles],
  );

  const handleScreenshotCapture = useCallback(async () => {
    let stream: MediaStream | null = null;

    try {
      stream = await requestDisplayCaptureStream({
        video: true,
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      if (!track) {
        return;
      }

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png", 0.95);
      });

      video.pause();
      video.srcObject = null;

      if (!blob) {
        return;
      }

      addFiles([
        new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" }),
      ]);

      track.stop();
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }, [addFiles]);

  const handleSend = useCallback(() => {
    if (disabled) {
      return;
    }

    const editorText = composerRef.current?.getText() ?? draft;
    const normalizedText = editorText.trim();
    const messageAttachments = attachments.length > 0 ? [...attachments] : undefined;

    if (!normalizedText && !messageAttachments?.length) {
      return;
    }

    onSend(normalizedText, messageAttachments);
    composerRef.current?.clear();
    setDraft("");
    clearAllAttachments();
    setIsEmojiOpen(false);
  }, [attachments, clearAllAttachments, disabled, draft, onSend]);

  const handleInsertContent = useCallback((content: string) => {
    composerRef.current?.insertContent(content);
    composerRef.current?.focus();
  }, []);

  if (editorRef) {
    (editorRef as MutableRefObject<RichTextEditorRef | null>).current = {
      getHTML: () => composerRef.current?.getHTML() ?? "",
      getText: () => composerRef.current?.getText() ?? draft,
      clear: () => {
        composerRef.current?.clear();
        setDraft("");
        clearAllAttachments();
      },
      focus: () => composerRef.current?.focus(),
      insertContent: (content: string) => handleInsertContent(content),
    };
  }

  return (
    <div className={disabled ? "opacity-60" : ""}>
      <div
        data-testid="chat-composer-lane"
        className="chat-content-lane w-full pb-[5px] pt-3 sm:pb-[5px] sm:pt-4"
      >
        <RichTextEditor
          ref={composerRef}
          variant="composer"
          placeholder={tr("Type a message...")}
          ariaLabel={tr("Type a message...")}
          submitOnEnter
          onSubmit={handleSend}
          onChange={(_html, text) => setDraft(text)}
          disabled={disabled}
          minHeight={112}
          maxHeight={280}
          contentClassName="pb-2"
          footer={
            <>
              {attachments.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2.5">
                  {attachments.map((attachment) => (
                    <AttachmentPreview
                      key={attachment.id}
                      attachment={attachment}
                      typeLabel={getAttachmentTypeLabel(attachment, tr)}
                      sizeLabel={formatFileSize(attachment.size)}
                      onRemove={() => removeAttachment(attachment.id)}
                    />
                  ))}
                </div>
              ) : null}

              <div
                data-testid="chat-composer-actions"
                className="chat-composer-actions flex flex-wrap items-center gap-3 sm:flex-nowrap sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <ComposerActionButton
                    title={tr("Files")}
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FilesIcon />
                  </ComposerActionButton>

                  <div ref={emojiAnchorRef} className="relative">
                    <ComposerActionButton
                      title={tr("Emoji")}
                      disabled={disabled}
                      active={isEmojiOpen}
                      onClick={() => setIsEmojiOpen((previous) => !previous)}
                    >
                      <EmojiIcon />
                    </ComposerActionButton>
                    <EmojiPicker
                      isOpen={isEmojiOpen}
                      onClose={() => setIsEmojiOpen(false)}
                      onSelect={(emoji) => {
                        handleInsertContent(emoji);
                        setIsEmojiOpen(false);
                      }}
                      anchorEl={emojiAnchorRef.current}
                    />
                  </div>

                  <ComposerActionButton
                    title={tr("Screenshot")}
                    disabled={disabled}
                    onClick={() => {
                      void handleScreenshotCapture();
                    }}
                  >
                    <ScreenshotIcon />
                  </ComposerActionButton>

                  <ComposerActionButton
                    title={tr("Code block")}
                    disabled={disabled}
                    onClick={() => handleInsertContent("```\n\n```")}
                  >
                    <CodeIcon />
                  </ComposerActionButton>

                  <ComposerActionButton
                    title={tr("@ mention")}
                    disabled={disabled}
                    onClick={() => handleInsertContent("@")}
                  >
                    <AtMentionIcon />
                  </ComposerActionButton>
                </div>

                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <span className="chat-composer-hint hidden text-xs lg:inline">
                    {tr("Press Enter to send, Shift + Enter for a new line")}
                  </span>
                  <SharedUi.Button
                    type="button"
                    onClick={handleSend}
                    disabled={!hasContent || disabled}
                    data-ready={hasContent && !disabled ? "true" : "false"}
                    className="chat-composer-send inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all"
                  >
                    <SendIcon />
                    <span>{tr("Send")}</span>
                  </SharedUi.Button>
                </div>
              </div>
            </>
          }
        />
      </div>

      <SharedUi.Input
        ref={fileInputRef}
        type="file"
        multiple
        disabled={disabled}
        accept="image/*,video/*,*/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
});

interface AttachmentPreviewProps {
  attachment: MediaItem;
  typeLabel: string;
  sizeLabel: string;
  onRemove: () => void;
}

const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  typeLabel,
  sizeLabel,
  onRemove,
}: AttachmentPreviewProps) {
  const { tr } = useAppTranslation();

  return (
    <div className="chat-composer-attachment group flex min-w-[220px] max-w-[280px] items-center gap-3 rounded-xl px-3 py-2.5">
      <div className="chat-composer-attachment-media flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        {attachment.type === "image" ? (
          <img
            src={attachment.url}
            alt={attachment.name || tr("Image")}
            className="h-full w-full object-cover"
          />
        ) : attachment.type === "video" ? (
          <VideoIcon />
        ) : (
          <FileIcon />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {attachment.name || tr("Attachment")}
        </p>
        <p className="truncate text-xs text-text-muted">
          {sizeLabel ? `${typeLabel} - ${sizeLabel}` : typeLabel}
        </p>
      </div>

      <SharedUi.Button
        type="button"
        aria-label={`${tr("Remove")} ${attachment.name || tr("Attachment")}`}
        onClick={onRemove}
        className="chat-composer-attachment-remove inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      >
        <CloseIcon />
      </SharedUi.Button>
    </div>
  );
});

interface ComposerActionButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}

const ComposerActionButton = memo(function ComposerActionButton({
  title,
  onClick,
  disabled = false,
  active = false,
  children,
}: ComposerActionButtonProps) {
  return (
    <SharedUi.Button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      data-active={active ? "true" : "false"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="chat-composer-action inline-flex h-10 w-10 items-center justify-center rounded-full transition-all"
    >
      {children}
    </SharedUi.Button>
  );
});

function FilesIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M14.5 6.5 9 12a3.5 3.5 0 1 0 5 5l7-7a5 5 0 0 0-7.07-7.07l-7.78 7.78"
      />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8.5 14.5c.8 1 2 1.5 3.5 1.5s2.7-.5 3.5-1.5M9 10h.01M15 10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
      />
    </svg>
  );
}

function ScreenshotIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H7l1.2-1.6A1.5 1.5 0 0 1 9.4 3h5.2a1.5 1.5 0 0 1 1.2.6L17 5h1.5A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9ZM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="m8 9-4 3 4 3m8-6 4 3-4 3M13 7l-2 10"
      />
    </svg>
  );
}

function AtMentionIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm2 10v-1a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v1m14.5-6.5V12a6.5 6.5 0 1 1-3.6-5.83"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M5 12h13m0 0-4.5-4.5M18 12l-4.5 4.5"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-5 w-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V8L14 3.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M14 3.5V8h5.5"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3.5 7A2.5 2.5 0 0 1 6 4.5h7A2.5 2.5 0 0 1 15.5 7v10A2.5 2.5 0 0 1 13 19.5H6A2.5 2.5 0 0 1 3.5 17V7Zm12 3 5-3v10l-5-3V10Z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M6 6l12 12M18 6 6 18"
      />
    </svg>
  );
}

export default ChatInput;
