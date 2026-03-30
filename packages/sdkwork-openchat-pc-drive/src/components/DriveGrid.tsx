import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input } from "@sdkwork/openchat-pc-ui";
import { FileService } from "../services";
import type { FileNode } from "../types";
import { useDriveStore } from "../store/driveStore";

interface DriveGridProps {
  renamingId: string | null;
  onRenameCommit: (id: string, newName: string) => Promise<void>;
  onRenameCancel: () => void;
  onContextMenu: (event: React.MouseEvent, item?: FileNode) => void;
  onPreview: (item: FileNode) => void;
}

const fileTypeLabel = (item: FileNode): string => {
  if (item.type === "folder") return "Folder";
  if (item.type === "image") return "Image";
  if (item.type === "video") return "Video";
  if (item.type === "audio") return "Audio";
  if (item.type === "pdf") return "PDF";
  if (item.type === "xls") return "Sheet";
  if (item.type === "ppt") return "Slide";
  if (item.type === "zip") return "Archive";
  if (item.type === "code") return "Code";
  return "File";
};

const formatDate = (value: number): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString();
};

function FileGlyph({ item }: { item: FileNode }) {
  const meta = FileService.getFileIcon(item.type);
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-[10px] font-semibold tracking-wide"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.icon}
    </div>
  );
}

function EmptyState() {
  const { tr } = useAppTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center text-text-secondary">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-bg-elevated text-sm font-medium text-text-muted">
        {tr("No files")}
      </div>
      <div className="text-base font-medium text-text-primary">{tr("No files here yet")}</div>
      <div className="max-w-sm text-sm">{tr("Create a folder or upload files to start organizing this drive.")}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: (event: React.MouseEvent) => void;
}) {
  return (
    <Button
      type="button"
      variant="unstyled"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      className="rounded-lg px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
    >
      {children}
    </Button>
  );
}

export function DriveGrid({
  renamingId,
  onRenameCommit,
  onRenameCancel,
  onContextMenu,
  onPreview,
}: DriveGridProps) {
  const { tr } = useAppTranslation();
  const { items, viewMode, selection, toggleSelection, clearSelection, navigateTo, navigateUp, moveItems } =
    useDriveStore();
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renamingId) {
      return;
    }
    const target = items.find((item) => item.id === renamingId);
    if (!target || !renameInputRef.current) {
      return;
    }
    setRenameValue(target.name);
    window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }, [items, renamingId]);

  const getGridColumns = (): number => {
    if (!containerRef.current) {
      return 4;
    }
    const width = containerRef.current.clientWidth;
    if (width >= 1536) return 8;
    if (width >= 1280) return 6;
    if (width >= 1024) return 5;
    if (width >= 768) return 4;
    return 2;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (renamingId) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      navigateUp();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (selection.size === 1) {
        const id = Array.from(selection)[0];
        const item = items.find((candidate) => candidate.id === id);
        if (item) {
          if (item.type === "folder") {
            if (!item.trashedAt) {
              navigateTo(item.id);
            }
          } else if (!item.trashedAt) {
            onPreview(item);
          }
        }
      }
      return;
    }

    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentId = Array.from(selection)[0];
    const currentIndex = items.findIndex((candidate) => candidate.id === currentId);

    let nextIndex = 0;
    if (currentIndex !== -1) {
      if (viewMode === "list") {
        if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
        if (event.key === "ArrowDown") nextIndex = Math.min(items.length - 1, currentIndex + 1);
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") nextIndex = currentIndex;
      } else {
        const columns = getGridColumns();
        if (event.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
        if (event.key === "ArrowRight") nextIndex = Math.min(items.length - 1, currentIndex + 1);
        if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - columns);
        if (event.key === "ArrowDown") nextIndex = Math.min(items.length - 1, currentIndex + columns);
      }
    }

    const nextItem = items[nextIndex];
    if (nextItem) {
      clearSelection();
      toggleSelection(nextItem.id, false);
    }
  };

  const commitRename = async () => {
    if (!renamingId) {
      return;
    }
    await onRenameCommit(renamingId, renameValue);
  };

  const handleItemClick = (event: React.MouseEvent, item: FileNode) => {
    event.stopPropagation();
    toggleSelection(item.id, event.metaKey || event.ctrlKey || event.shiftKey);
    containerRef.current?.focus();
  };

  const handleDoubleClick = (event: React.MouseEvent, item: FileNode) => {
    event.stopPropagation();
    if (item.type === "folder") {
      if (!item.trashedAt) {
        navigateTo(item.id);
      }
      return;
    }
    if (!item.trashedAt) {
      onPreview(item);
    }
  };

  const handleDropOnFolder = async (event: React.DragEvent, targetFolder: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolderId(null);
    if (targetFolder.type !== "folder" || selection.size === 0 || targetFolder.trashedAt) {
      return;
    }
    const ids = Array.from(selection).filter((id) => id !== targetFolder.id);
    if (ids.length > 0) {
      await moveItems(ids, targetFolder.id);
    }
  };

  const startDrag = (event: React.DragEvent, item: FileNode) => {
    if (item.trashedAt) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    if (!selection.has(item.id)) {
      clearSelection();
      toggleSelection(item.id, false);
    }
  };

  if (items.length === 0) {
    return <EmptyState />;
  }

  if (viewMode === "list") {
    return (
      <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} className="flex h-full min-h-0 flex-col outline-none">
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_140px_110px_90px_40px] items-center border-b border-border bg-bg-primary px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
          <div>{tr("Name")}</div>
          <div className="text-right">{tr("Updated")}</div>
          <div>{tr("Type")}</div>
          <div className="text-right">{tr("Size")}</div>
          <div />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((item) => {
            const selected = selection.has(item.id);
            const renaming = renamingId === item.id;
            const draggedOver = dragOverFolderId === item.id;
            const itemClass = [
              "grid grid-cols-[minmax(0,1fr)_140px_110px_90px_40px] items-center px-4 py-2.5 transition-colors",
              selected ? "bg-primary/10" : "hover:bg-bg-hover",
              draggedOver ? "bg-primary/15 ring-1 ring-primary/40" : "",
              item.trashedAt ? "opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={item.id}
                draggable={!renaming && !item.trashedAt}
                onDragStart={(event) => startDrag(event, item)}
                onDragOver={(event) => {
                  if (item.type === "folder" && !item.trashedAt) {
                    event.preventDefault();
                    setDragOverFolderId(item.id);
                  }
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(event) => handleDropOnFolder(event, item)}
                onClick={(event) => handleItemClick(event, item)}
                onDoubleClick={(event) => handleDoubleClick(event, item)}
                onContextMenu={(event) => onContextMenu(event, item)}
                className={itemClass}
              >
                <div className="flex min-w-0 items-center gap-3 pr-4">
                  <div className="flex shrink-0 items-center gap-2">
                    <FileGlyph item={item} />
                    {item.isStarred && !item.trashedAt ? <span className="text-amber-400">*</span> : null}
                  </div>
                  {renaming ? (
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void commitRename();
                        }
                        if (event.key === "Escape") {
                          onRenameCancel();
                        }
                      }}
                      onBlur={() => void commitRename()}
                      onClick={(event) => event.stopPropagation()}
                      className="w-full rounded-lg border border-primary/40 bg-bg-primary px-2 py-1.5 text-sm outline-none"
                    />
                  ) : (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-xs text-text-muted">{tr(fileTypeLabel(item))}</div>
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-text-secondary">
                  {formatDate(item.updateTime || item.createTime || Date.now())}
                </div>
                <div className="text-xs text-text-secondary">{tr(fileTypeLabel(item))}</div>
                <div className="text-right text-xs text-text-secondary">
                  {item.type === "folder" ? "--" : FileService.formatBytes(item.size || 0)}
                </div>
                <div className="flex justify-end">
                  <ActionButton onClick={(event) => onContextMenu(event, item)}>{tr("More")}</ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="grid grid-cols-2 gap-4 content-start p-2 pb-10 outline-none md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
    >
      {items.map((item) => {
        const selected = selection.has(item.id);
        const renaming = renamingId === item.id;
        const draggedOver = dragOverFolderId === item.id;

        return (
          <div
            key={item.id}
            draggable={!renaming && !item.trashedAt}
            onDragStart={(event) => startDrag(event, item)}
            onDragOver={(event) => {
              if (item.type === "folder" && !item.trashedAt) {
                event.preventDefault();
                setDragOverFolderId(item.id);
              }
            }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(event) => handleDropOnFolder(event, item)}
            onClick={(event) => handleItemClick(event, item)}
            onDoubleClick={(event) => handleDoubleClick(event, item)}
            onContextMenu={(event) => onContextMenu(event, item)}
            className={[
              "group rounded-2xl border p-3 transition-colors",
              selected ? "border-primary/30 bg-primary/10" : "border-border bg-bg-elevated hover:bg-bg-hover",
              draggedOver ? "ring-1 ring-primary/40" : "",
              item.trashedAt ? "opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <FileGlyph item={item} />
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <ActionButton onClick={(event) => onContextMenu(event, item)}>{tr("More")}</ActionButton>
              </div>
            </div>

            {renaming ? (
              <Input
                ref={renameInputRef}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void commitRename();
                  }
                  if (event.key === "Escape") {
                    onRenameCancel();
                  }
                }}
                onBlur={() => void commitRename()}
                onClick={(event) => event.stopPropagation()}
                className="mb-2 w-full rounded-lg border border-primary/40 bg-bg-primary px-2 py-1.5 text-sm outline-none"
              />
            ) : (
              <div className="mb-2 min-w-0">
                <div className="truncate text-sm font-medium text-text-primary" title={item.name}>
                  {item.name}
                </div>
                <div className="text-xs text-text-muted">{tr(fileTypeLabel(item))}</div>
              </div>
            )}

            <div className="text-xs text-text-secondary">
              {item.type === "folder"
                ? formatDate(item.updateTime || item.createTime || Date.now())
                : FileService.formatBytes(item.size || 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DriveGrid;
