import { useEffect, useRef, useState, type ReactNode } from "react";
import { Cloud, Clock3, FolderPlus, Plus, Star, Trash2, Upload } from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input, Modal, ModalButtonGroup } from "@sdkwork/openchat-pc-ui";
import { FileService } from "../services";
import { DriveVirtualPaths, useDriveStore } from "../store/driveStore";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <Button
      type="button"
      variant="unstyled"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      <span className={active ? "text-primary" : "text-text-muted"}>{icon}</span>
      <span className="truncate">{label}</span>
    </Button>
  );
}

export function DriveSidebar() {
  const { tr } = useAppTranslation();
  const {
    currentPath,
    stats,
    summary,
    navigateTo,
    navigateHome,
    createFolder,
    uploadFiles,
    isVirtualView,
    isTrashView,
    isStarredView,
    isRecentView,
  } = useDriveStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const percent = stats && stats.total > 0 ? Math.min(100, (stats.used / stats.total) * 100) : 0;
  const activeRoot = !isVirtualView && !currentPath;

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!menuOpen) {
        return;
      }
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [menuOpen]);

  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      return;
    }
    await createFolder(name);
    setFolderName("");
    setFolderModalOpen(false);
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-bg-secondary px-3 py-4">
      <div ref={menuRef} className="relative mb-4">
        <Button
          type="button"
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setMenuOpen((open) => !open)}
          className="!h-11 !w-full !rounded-xl"
        >
          {tr("New")}
        </Button>

        {menuOpen ? (
          <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-xl">
            <Button
              type="button"
              variant="unstyled"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-hover"
              onClick={() => {
                setMenuOpen(false);
                setFolderModalOpen(true);
              }}
            >
              <FolderPlus size={16} className="text-amber-500" />
              {tr("New folder")}
            </Button>
            <Button
              type="button"
              variant="unstyled"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-hover"
              onClick={() => {
                setMenuOpen(false);
                void uploadFiles();
              }}
            >
              <Upload size={16} className="text-sky-500" />
              {tr("Upload files")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <SidebarItem
          icon={<Cloud size={18} />}
          label={tr("My Drive")}
          active={activeRoot}
          onClick={navigateHome}
        />
        <SidebarItem
          icon={<Star size={18} />}
          label={tr("Starred")}
          active={isStarredView}
          onClick={() => navigateTo(DriveVirtualPaths.starred)}
        />
        <SidebarItem
          icon={<Clock3 size={18} />}
          label={tr("Recent")}
          active={isRecentView}
          onClick={() => navigateTo(DriveVirtualPaths.recent)}
        />
        <SidebarItem
          icon={<Trash2 size={18} />}
          label={tr("Trash")}
          active={isTrashView}
          onClick={() => navigateTo(DriveVirtualPaths.trash)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-bg-primary p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-text-primary">{tr("Storage")}</div>
          <Cloud size={16} className="text-text-muted" />
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-bg-hover">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{tr("{{used}} used", { used: FileService.formatBytes(stats?.used || 0) })}</span>
          <span>{tr("{{count}} items", { count: summary.total })}</span>
        </div>
      </div>

      <Modal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setFolderName("");
        }}
        title={tr("Create folder")}
        size="md"
        customWidth="min(520px,92vw)"
      >
        <div className="space-y-4 p-6">
          <Input
            value={folderName}
            onValueChange={setFolderName}
            placeholder={tr("Folder name")}
            autoFocus
          />
          <ModalButtonGroup
            onCancel={() => {
              setFolderModalOpen(false);
              setFolderName("");
            }}
            onConfirm={handleCreateFolder}
            confirmText={tr("Create")}
            disabled={!folderName.trim()}
          />
        </div>
      </Modal>
    </aside>
  );
}

export default DriveSidebar;
