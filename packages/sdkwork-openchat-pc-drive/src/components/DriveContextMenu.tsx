import { FolderOpen, FolderPlus, Pencil, RefreshCw, Star, Trash2, Upload, X } from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button } from "@sdkwork/openchat-pc-ui";
import type { FileNode } from "../types";

interface DriveContextMenuProps {
  x: number;
  y: number;
  item?: FileNode;
  isTrashView: boolean;
  isVirtualView: boolean;
  onClose: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onRefresh: () => void;
  onRename: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onOpen: () => void;
}

export function DriveContextMenu({
  x,
  y,
  item,
  isTrashView,
  isVirtualView,
  onClose,
  onNewFolder,
  onUpload,
  onRefresh,
  onRename,
  onToggleStar,
  onDelete,
  onRestore,
  onOpen,
}: DriveContextMenuProps) {
  const { tr } = useAppTranslation();
  const left = typeof window !== "undefined" ? Math.min(x, Math.max(12, window.innerWidth - 240)) : x;
  const top = typeof window !== "undefined" ? Math.min(y, Math.max(12, window.innerHeight - 320)) : y;

  const menuItemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover";

  return (
    <>
      <Button
        type="button"
        variant="unstyled"
        aria-label={tr("Close menu")}
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-[240px] overflow-hidden rounded-2xl border border-border bg-bg-elevated p-2 shadow-2xl"
        style={{ left, top }}
      >
        {item ? (
          <>
            {!isTrashView ? (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onOpen}>
                <FolderOpen size={15} className="text-sky-400" />
                {tr("Open")}
              </Button>
            ) : null}
            {!isTrashView ? (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onRename}>
                <Pencil size={15} className="text-text-muted" />
                {tr("Rename")}
              </Button>
            ) : null}
            {!isTrashView ? (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onToggleStar}>
                <Star size={15} className="text-amber-400" />
                {item.isStarred ? tr("Unstar") : tr("Star")}
              </Button>
            ) : null}
            {!isTrashView ? (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onDelete}>
                <Trash2 size={15} className="text-rose-400" />
                {tr("Move to Trash")}
              </Button>
            ) : (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onRestore}>
                <RefreshCw size={15} className="text-emerald-400" />
                {tr("Restore")}
              </Button>
            )}
            {isTrashView ? (
              <Button type="button" variant="unstyled" className={menuItemClass} onClick={onDelete}>
                <Trash2 size={15} className="text-rose-400" />
                {tr("Delete Permanently")}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            {!isTrashView && !isVirtualView ? (
              <>
                <Button type="button" variant="unstyled" className={menuItemClass} onClick={onNewFolder}>
                  <FolderPlus size={15} className="text-amber-400" />
                  {tr("New folder")}
                </Button>
                <Button type="button" variant="unstyled" className={menuItemClass} onClick={onUpload}>
                  <Upload size={15} className="text-sky-400" />
                  {tr("Upload files")}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="unstyled" className={menuItemClass} onClick={onRefresh}>
              <RefreshCw size={15} className="text-text-muted" />
              {tr("Refresh")}
            </Button>
          </>
        )}

        <div className="my-2 h-px bg-border" />

        <Button type="button" variant="unstyled" className={`${menuItemClass} text-text-secondary`} onClick={onClose}>
          <X size={15} className="text-text-muted" />
          {tr("Close")}
        </Button>
      </div>
    </>
  );
}

export default DriveContextMenu;
