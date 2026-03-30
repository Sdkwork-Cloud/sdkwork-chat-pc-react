import { useEffect, useRef, useState } from "react";
import {
  ArrowDownAZ,
  Box,
  ChevronDown,
  Code,
  Database,
  Download,
  FileText,
  Film,
  Filter,
  Cloud,
  LayoutGrid,
  Image as ImageIcon,
  List,
  Pencil,
  RefreshCw,
  Search,
  Music,
  Star,
  Trash2,
  Upload,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input } from "@sdkwork/openchat-pc-ui";
import type { FileNode } from "../types";
import { DriveBreadcrumbs } from "../components/DriveBreadcrumbs";
import { DriveContextMenu } from "../components/DriveContextMenu";
import { DriveGrid } from "../components/DriveGrid";
import { DriveSidebar } from "../components/DriveSidebar";
import { FilePreviewModal } from "../components/FilePreviewModal";
import { DriveStoreProvider, useDriveStore, type DriveFileTypeFilter } from "../store/driveStore";

const filterOptions: Array<{
  id: DriveFileTypeFilter;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "all", label: "All Files", icon: Filter },
  { id: "document", label: "Documents", icon: FileText },
  { id: "sheet", label: "Spreadsheets", icon: Database },
  { id: "presentation", label: "Presentations", icon: Box },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "video", label: "Videos", icon: Film },
  { id: "audio", label: "Audio", icon: Music },
  { id: "code", label: "Code", icon: Code },
  { id: "font", label: "Fonts", icon: Type },
  { id: "archive", label: "Archives", icon: Box },
  { id: "3d", label: "3D Models", icon: Box },
];

function DrivePageContent() {
  const { tr } = useAppTranslation();
  const {
    currentPath,
    items,
    viewMode,
    isLoading,
    setViewMode,
    sortBy,
    sortDirection,
    setSort,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    selection,
    clearSelection,
    deleteItems,
    purgeItems,
    restoreItems,
    toggleStar,
    refresh,
    createFolder,
    renameItem,
    uploadFiles,
    downloadItems,
    emptyTrash,
    isTrashView,
    isVirtualView,
    isStarredView,
    isRecentView,
    openItem,
    selectAll,
  } = useDriveStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item?: FileNode } | null>(null);
  const [previewItem, setPreviewItem] = useState<FileNode | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        const target = event.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
          return;
        }
        event.preventDefault();
        selectAll();
      }
      if (event.key === "Escape") {
        setContextMenu(null);
        setRenamingId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectAll]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!sortMenuOpen) {
        if (!filterMenuOpen) {
          return;
        }
      }
      const target = event.target as Node | null;
      if (target && sortMenuRef.current?.contains(target)) {
        if (!filterMenuOpen || !filterMenuRef.current?.contains(target)) {
          return;
        }
      }
      if (target && filterMenuRef.current?.contains(target)) {
        return;
      }
      setSortMenuOpen(false);
      setFilterMenuOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [filterMenuOpen, sortMenuOpen]);

  const handleBackgroundContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (event.dataTransfer.items?.length > 0 && Array.from(event.dataTransfer.types).includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (event.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleItemContextMenu = (event: React.MouseEvent, item?: FileNode) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };

  const handleRenameCommit = async (id: string, name: string) => {
    await renameItem(id, name);
    setRenamingId(null);
  };

  const handlePreview = (item: FileNode) => {
    if (item.trashedAt) {
      return;
    }
    setPreviewItem(item);
    void openItem(item);
  };

  const selectedItems = items.filter((item) => selection.has(item.id));
  const currentLabel = isTrashView
    ? tr("Trash")
    : isStarredView
      ? tr("Starred")
      : isRecentView
        ? tr("Recent")
        : currentPath
          ? tr("Folder")
          : tr("My Drive");

  const handleSelectedDelete = async () => {
    if (selectedItems.length === 0) {
      return;
    }
    if (isTrashView) {
      await purgeItems(selectedItems.map((item) => item.id));
    } else {
      await deleteItems(selectedItems.map((item) => item.id));
    }
    clearSelection();
  };

  const handleSelectedRestore = async () => {
    if (selectedItems.length === 0) {
      return;
    }
    await restoreItems(selectedItems.map((item) => item.id));
    clearSelection();
  };

  const handleSelectedStar = async () => {
    if (selectedItems.length === 0) {
      return;
    }
    for (const item of selectedItems) {
      await toggleStar(item.id);
    }
    clearSelection();
  };

  const handleNewFolder = async () => {
    const name = window.prompt(tr("Folder name"));
    if (name && name.trim()) {
      await createFolder(name.trim());
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-primary text-text-primary">
      <div className="hidden lg:block">
        <DriveSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-bg-secondary px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-text-primary">{tr("Drive")}</div>
                <span className="rounded-full border border-border bg-bg-hover px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                  {currentLabel}
                </span>
                <span className="rounded-full border border-border bg-bg-hover px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                  {tr("{{count}} items", { count: items.length })}
                </span>
              </div>
              <div className="text-xs text-text-secondary">
                {tr("Manage folders, recent items, favorites, and trash from one place.")}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[240px] flex-1 xl:max-w-[360px]">
                <Input
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder={tr("Search files")}
                  prefix={<Search size={15} className="text-text-muted" />}
                />
              </div>
              <div ref={filterMenuRef} className="relative">
                <Button
                  type="button"
                  variant="unstyled"
                  onClick={() => setFilterMenuOpen((open) => !open)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                    filterType === "all"
                      ? "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      : "border-primary/30 bg-primary/10 text-primary"
                  }`}
                >
                  <Filter size={14} />
                  <span className="hidden sm:inline">
                    {tr(filterOptions.find((option) => option.id === filterType)?.label || "All Files")}
                  </span>
                  <ChevronDown size={12} className="opacity-60" />
                </Button>
                {filterMenuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-2 shadow-xl">
                    {filterOptions.map((option) => {
                      const ActiveIcon = option.icon;
                      const active = filterType === option.id;
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant="unstyled"
                          onClick={() => {
                            setFilterType(option.id);
                            setFilterMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover ${
                            active ? "text-primary" : "text-text-secondary"
                          }`}
                        >
                          <ActiveIcon size={15} />
                          <span>{tr(option.label)}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <Button type="button" variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refresh()}>
                {tr("Refresh")}
              </Button>
              {!isVirtualView ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => void uploadFiles()}
                >
                  {tr("Upload")}
                </Button>
              ) : null}
              {!isVirtualView ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={14} />}
                  onClick={handleNewFolder}
                >
                  {tr("New folder")}
                </Button>
              ) : null}
              {isTrashView ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => void emptyTrash()}
                >
                  {tr("Empty trash")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <DriveBreadcrumbs />
            <div ref={sortMenuRef} className="relative flex items-center gap-1 rounded-xl border border-border bg-bg-primary p-1">
              <Button
                type="button"
                variant="unstyled"
                onClick={() => setViewMode("list")}
                className={`rounded-lg p-2 transition-colors ${viewMode === "list" ? "bg-bg-hover text-text-primary" : "text-text-muted hover:bg-bg-hover hover:text-text-primary"}`}
                aria-label={tr("List view")}
              >
                <List size={15} />
              </Button>
              <Button
                type="button"
                variant="unstyled"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-2 transition-colors ${viewMode === "grid" ? "bg-bg-hover text-text-primary" : "text-text-muted hover:bg-bg-hover hover:text-text-primary"}`}
                aria-label={tr("Grid view")}
              >
                <LayoutGrid size={15} />
              </Button>
              <Button
                type="button"
                variant="unstyled"
                onClick={() => setSortMenuOpen((open) => !open)}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                aria-label={tr("Toggle sort direction")}
              >
                <ArrowDownAZ size={15} className={sortDirection === "asc" ? "rotate-180" : ""} />
              </Button>
              {sortMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-2 shadow-xl">
                  {(["name", "date", "size"] as const).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="unstyled"
                      onClick={() => {
                        setSort(option, sortDirection);
                        setSortMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover ${
                        sortBy === option ? "text-primary" : "text-text-secondary"
                      }`}
                    >
                      <span className="capitalize">{tr(option)}</span>
                      {sortBy === option ? <span className="text-xs">{tr("Selected")}</span> : null}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => {
                      setSort(sortBy, sortDirection === "asc" ? "desc" : "asc");
                      setSortMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    <span>{tr("Direction")}</span>
                    <span>{sortDirection === "asc" ? tr("Asc") : tr("Desc")}</span>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className="relative min-h-0 flex-1 overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onContextMenu={handleBackgroundContextMenu}
          onClick={() => {
            clearSelection();
            setContextMenu(null);
          }}
        >
          <div className="h-full overflow-y-auto px-4 py-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center gap-3 text-text-muted">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">{tr("Loading content...")}</span>
              </div>
            ) : (
              <DriveGrid
                renamingId={renamingId}
                onRenameCommit={handleRenameCommit}
                onRenameCancel={() => setRenamingId(null)}
                onContextMenu={handleItemContextMenu}
                onPreview={handlePreview}
              />
            )}
          </div>
          {isDragging && !isTrashView ? (
            <div className="pointer-events-none absolute inset-4 z-20 flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/50 bg-primary/5 backdrop-blur-[1px]">
              <Cloud size={56} className="mb-3 text-primary" />
              <div className="text-xl font-semibold text-text-primary">{tr("Drop files to upload")}</div>
            </div>
          ) : null}
        </main>
      </div>

      {selection.size > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-2 shadow-2xl">
          <div className="rounded-full border-r border-border pr-3 text-xs font-medium text-text-primary">
            {tr("{{count}} selected", { count: selection.size })}
          </div>
          {isTrashView ? (
            <>
              <Button type="button" variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void handleSelectedRestore()}>
                {tr("Restore")}
              </Button>
              <Button type="button" variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleSelectedDelete()}>
                {tr("Delete")}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => void downloadItems(selectedItems.map((item) => item.id))}>
                {tr("Download")}
              </Button>
              <Button type="button" variant="secondary" size="sm" icon={<Star size={14} />} onClick={() => void handleSelectedStar()}>
                {tr("Star")}
              </Button>
              {selectedItems.length === 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={14} />}
                  onClick={() => setRenamingId(selectedItems[0].id)}
                >
                  {tr("Rename")}
                </Button>
              ) : null}
              <Button type="button" variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleSelectedDelete()}>
                {tr("Trash")}
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" size="sm" icon={<X size={14} />} onClick={clearSelection} />
        </div>
      ) : null}

      {contextMenu ? (
        <DriveContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          isTrashView={isTrashView}
          isVirtualView={isVirtualView}
          onClose={() => setContextMenu(null)}
          onNewFolder={handleNewFolder}
          onUpload={() => void uploadFiles()}
          onRefresh={() => void refresh()}
          onRename={() => {
            if (contextMenu.item) {
              setRenamingId(contextMenu.item.id);
            }
            setContextMenu(null);
          }}
          onToggleStar={() => {
            if (contextMenu.item) {
              void toggleStar(contextMenu.item.id);
            }
            setContextMenu(null);
          }}
          onDelete={() => {
            if (!contextMenu.item) {
              setContextMenu(null);
              return;
            }
            if (isTrashView) {
              void purgeItems([contextMenu.item.id]);
            } else {
              void deleteItems([contextMenu.item.id]);
            }
            setContextMenu(null);
          }}
          onRestore={() => {
            if (contextMenu.item) {
              void restoreItems([contextMenu.item.id]);
            }
            setContextMenu(null);
          }}
          onOpen={() => {
            if (contextMenu.item) {
              if (contextMenu.item.type === "folder") {
                void openItem(contextMenu.item);
              } else {
                handlePreview(contextMenu.item);
              }
            }
            setContextMenu(null);
          }}
        />
      ) : null}

      <FilePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}

export function CloudDrivePage() {
  return (
    <DriveStoreProvider>
      <DrivePageContent />
    </DriveStoreProvider>
  );
}

export default CloudDrivePage;
