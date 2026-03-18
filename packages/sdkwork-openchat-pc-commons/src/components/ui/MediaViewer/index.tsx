import { memo, useCallback, useEffect, useState } from "react";
import { formatNumber, useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export type MediaType = "image" | "video" | "file";

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  duration?: number;
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: MediaItem) => void;
}

export const MediaViewer = memo(({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
}: MediaViewerProps) => {
  const { tr } = useAppTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const currentItem = items[currentIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [initialIndex, isOpen]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((previous) => (previous > 0 ? previous - 1 : items.length - 1));
    setScale(1);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((previous) => (previous < items.length - 1 ? previous + 1 : 0));
    setScale(1);
  }, [items.length]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isOpen, onClose]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) {
      return "";
    }

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${formatNumber(size, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) {
      return "";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!isOpen || !currentItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 shadow-sm backdrop-blur-md">
            <span className="text-xs font-bold tracking-wider text-white">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
          {currentItem.name ? (
            <span className="max-w-[400px] truncate text-sm font-medium text-white drop-shadow-md">
              {currentItem.name}
            </span>
          ) : null}
        </div>

        <div className="flex items-center space-x-3">
          {currentItem.type === "image" ? (
            <div className="flex items-center rounded-xl border border-white/10 bg-white/10 p-1 backdrop-blur-md">
              <button
                onClick={() => setScale((previous) => Math.max(previous - 0.25, 0.5))}
                className="rounded-lg p-1.5 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                title={tr("Zoom out")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="min-w-[50px] text-center text-xs font-bold text-white">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((previous) => Math.min(previous + 0.25, 3))}
                className="rounded-lg p-1.5 text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                title={tr("Zoom in")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          ) : null}

          <button
            onClick={() => onDownload?.(currentItem)}
            className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-white/80 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-95 backdrop-blur-md"
            title={tr("Download")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-white/80 shadow-sm transition-all hover:bg-error hover:text-white active:scale-95 backdrop-blur-md"
            title={tr("Close (Esc)")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center overflow-hidden p-8 md:p-16">
        {currentItem.type === "image" ? (
          <img
            src={currentItem.url}
            alt={currentItem.name || tr("Image")}
            className="max-h-full max-w-full object-contain shadow-2xl transition-all duration-300 animate-in zoom-in-95"
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        ) : null}

        {currentItem.type === "video" ? (
          <div className="relative max-h-full max-w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95">
            <video
              src={currentItem.url}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full"
              poster={currentItem.thumbnail}
            >
              {tr("Your browser does not support video playback.")}
            </video>
          </div>
        ) : null}

        {currentItem.type === "file" ? (
          <div className="w-full max-w-lg rounded-[32px] border border-border bg-bg-elevated/80 p-16 shadow-2xl backdrop-blur-xl animate-in zoom-in-95">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[24px] border border-primary/20 bg-primary/10 shadow-glow-primary">
              <svg className="h-12 w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mb-3 text-center text-2xl font-bold text-text-primary">
              {currentItem.name || tr("Unknown file")}
            </h3>
            <p className="mb-8 text-center text-sm font-medium text-text-tertiary">
              {formatFileSize(currentItem.size)}
            </p>
            <button
              onClick={() => onDownload?.(currentItem)}
              className="mx-auto flex items-center space-x-3 rounded-2xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-glow-primary transition-all hover:bg-primary-hover active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{tr("Download now")}</span>
            </button>
          </div>
        ) : null}
      </div>

      {items.length > 1 ? (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full border border-white/5 bg-white/5 p-4 text-white/40 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-90 backdrop-blur-md"
            title={tr("Previous item (Left Arrow)")}
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/5 bg-white/5 p-4 text-white/40 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-90 backdrop-blur-md"
            title={tr("Next item (Right Arrow)")}
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-6 py-5">
        <div className="flex items-center justify-center space-x-6 text-xs font-bold uppercase tracking-widest text-white/60">
          {currentItem.size ? <span>{tr("Size")}: {formatFileSize(currentItem.size)}</span> : null}
          {currentItem.duration ? <span>{tr("Duration")}: {formatDuration(currentItem.duration)}</span> : null}
        </div>
      </div>
    </div>
  );
});

MediaViewer.displayName = "MediaViewer";

export default MediaViewer;
