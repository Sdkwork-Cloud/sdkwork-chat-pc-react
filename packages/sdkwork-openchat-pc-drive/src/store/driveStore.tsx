import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FileService } from "../services";
import type { BreadcrumbItem, FileNode, StorageStats } from "../types";

export type DriveViewMode = "grid" | "list";
export type DriveSortOption = "name" | "date" | "size";
export type DriveSortDirection = "asc" | "desc";
export type DriveFileTypeFilter =
  | "all"
  | "document"
  | "sheet"
  | "presentation"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "font"
  | "3d";

interface DriveStoreContextValue {
  currentPath: string;
  items: FileNode[];
  allFiles: FileNode[];
  stats: StorageStats | null;
  summary: {
    total: number;
    folders: number;
    files: number;
    starred: number;
    bytes: number;
  };
  breadcrumbs: BreadcrumbItem[];
  favoriteFileIds: string[];
  recentFileIds: string[];
  isLoading: boolean;
  viewMode: DriveViewMode;
  sortBy: DriveSortOption;
  sortDirection: DriveSortDirection;
  filterType: DriveFileTypeFilter;
  searchQuery: string;
  selection: Set<string>;
  isVirtualView: boolean;
  isTrashView: boolean;
  isStarredView: boolean;
  isRecentView: boolean;
  setViewMode: (value: DriveViewMode) => void;
  setSort: (option: DriveSortOption, direction: DriveSortDirection) => void;
  setFilterType: (value: DriveFileTypeFilter) => void;
  setSearchQuery: (value: string) => void;
  navigateTo: (path: string) => void;
  navigateHome: () => void;
  navigateUp: () => void;
  refresh: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  uploadFiles: (files?: File[]) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  purgeItems: (ids: string[]) => Promise<void>;
  restoreItems: (ids: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  renameItem: (id: string, newName: string) => Promise<void>;
  moveItems: (ids: string[], targetFolderId: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  downloadItems: (ids: string[]) => Promise<void>;
  openItem: (item: FileNode) => Promise<void>;
  markOpened: (id: string) => void;
  toggleSelection: (id: string, multi: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

const DriveStoreContext = createContext<DriveStoreContextValue | undefined>(undefined);

const TRASH_PATH = "virtual://trash";
const STARRED_PATH = "virtual://starred";
const RECENT_PATH = "virtual://recent";

const unwrap = <T,>(result: { success: boolean; data?: T; error?: string; message?: string }, operation: string): T => {
  if (!result.success) {
    throw new Error(result.error || result.message || operation);
  }
  if (typeof result.data === "undefined") {
    throw new Error(operation);
  }
  return result.data;
};

const isTrashed = (item: FileNode): boolean => Boolean(item.trashedAt) || item.status === "DELETED";

const normalizeText = (value: string): string => value.trim().toLowerCase();

const fileTypeMatches = (item: FileNode, filter: DriveFileTypeFilter): boolean => {
  if (filter === "all" || item.type === "folder") {
    return true;
  }

  const name = normalizeText(item.name);
  const mime = normalizeText(item.mimeType || "");

  switch (filter) {
    case "image":
      return mime.startsWith("image/") || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico|tiff)$/.test(name);
    case "video":
      return mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(name);
    case "audio":
      return mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac)$/.test(name);
    case "document":
      return (
        mime.includes("pdf") ||
        mime.includes("text") ||
        /\.(pdf|doc|docx|txt|md|rtf|odt)$/.test(name)
      );
    case "sheet":
      return /\.(xls|xlsx|csv|tsv|ods)$/.test(name);
    case "presentation":
      return /\.(ppt|pptx|odp)$/.test(name);
    case "archive":
      return mime.includes("zip") || mime.includes("compressed") || /\.(zip|tar|gz|rar|7z)$/.test(name);
    case "code":
      return /\.(ts|tsx|js|jsx|json|html|css|py|rs|go|java|c|cpp|h|xml|yaml|yml|sh|bat)$/.test(name);
    case "font":
      return /\.(ttf|otf|woff|woff2|eot)$/.test(name);
    case "3d":
      return /\.(obj|fbx|glb|gltf|stl|blend)$/.test(name);
    default:
      return true;
  }
};

const buildSummary = (files: FileNode[]) => {
  return files.reduce(
    (summary, item) => {
      if (isTrashed(item)) {
        return summary;
      }
      summary.total += 1;
      summary.bytes += item.size || 0;
      if (item.type === "folder") {
        summary.folders += 1;
      } else {
        summary.files += 1;
      }
      if (item.isStarred) {
        summary.starred += 1;
      }
      return summary;
    },
    {
      total: 0,
      folders: 0,
      files: 0,
      starred: 0,
      bytes: 0,
    },
  );
};

const sortItems = (items: FileNode[], sortBy: DriveSortOption, sortDirection: DriveSortDirection): FileNode[] => {
  return [...items].sort((left, right) => {
    if (left.type === "folder" && right.type !== "folder") {
      return -1;
    }
    if (left.type !== "folder" && right.type === "folder") {
      return 1;
    }

    let comparison = 0;
    if (sortBy === "size") {
      comparison = (left.size || 0) - (right.size || 0);
    } else if (sortBy === "date") {
      comparison = (left.updateTime || 0) - (right.updateTime || 0);
    } else {
      comparison = left.name.localeCompare(right.name, "zh-CN", { numeric: true, sensitivity: "base" });
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });
};

const buildBreadcrumbs = (files: FileNode[], path: string): BreadcrumbItem[] => {
  if (!path || path.startsWith("virtual://")) {
    return [];
  }

  const trail: BreadcrumbItem[] = [];
  const seen = new Set<string>();
  let current = files.find((item) => item.id === path) || null;
  let guard = 0;

  while (current && guard < 32) {
    if (seen.has(current.id)) {
      break;
    }
    seen.add(current.id);
    trail.unshift({ id: current.id, name: current.name });
    if (!current.parentId) {
      break;
    }
    current = files.find((item) => item.id === current?.parentId) || null;
    guard += 1;
  }

  return trail;
};

const detectFileType = (file: File): FileNode["type"] => {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico|tiff)$/.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac)$/.test(name)) return "audio";
  if (mime.includes("pdf") || /\.(pdf)$/.test(name)) return "pdf";
  if (/\.(xls|xlsx|csv|tsv|ods)$/.test(name)) return "xls";
  if (/\.(ppt|pptx|odp)$/.test(name)) return "ppt";
  if (/\.(zip|tar|gz|rar|7z)$/.test(name)) return "zip";
  if (/\.(ts|tsx|js|jsx|json|html|css|py|rs|go|java|c|cpp|h|xml|yaml|yml|sh|bat|md|txt)$/.test(name)) return "code";
  if (/\.(ttf|otf|woff|woff2|eot)$/.test(name)) return "unknown";
  return "doc";
};

const isVirtualPath = (value: string): boolean =>
  value === TRASH_PATH || value === STARRED_PATH || value === RECENT_PATH;

export function DriveStoreProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState("");
  const [allFiles, setAllFiles] = useState<FileNode[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<DriveViewMode>("list");
  const [sortBy, setSortBy] = useState<DriveSortOption>("name");
  const [sortDirection, setSortDirection] = useState<DriveSortDirection>("asc");
  const [filterType, setFilterType] = useState<DriveFileTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [favoriteFileIds, setFavoriteFileIds] = useState<string[]>([]);
  const [recentFileIds, setRecentFileIds] = useState<string[]>([]);

  const loadWorkspace = async (path = currentPath) => {
    setIsLoading(true);
    try {
      const files = unwrap(await FileService.getAllFiles(true), "Failed to load drive files");
      const storageStats = unwrap(await FileService.getStorageStats(), "Failed to load storage stats");
      setAllFiles(files);
      setStats(storageStats);
      setFavoriteFileIds(FileService.getFavoriteFileIds());
      setRecentFileIds(FileService.getRecentFileIds());
      setSelection(new Set());

      if (path !== currentPath) {
        setCurrentPath(path);
      }
    } catch (error) {
      console.error("[DriveStore] loadWorkspace failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentPath) {
      return;
    }
    const selected = allFiles.find((item) => item.id === currentPath);
    if (selected) {
      void FileService.markFileOpened(selected.id);
      setRecentFileIds(FileService.getRecentFileIds());
    }
  }, [allFiles, currentPath]);

  const baseItems = useMemo(() => {
    const visible = allFiles.filter((item) => !isTrashed(item));

    if (!currentPath) {
      return visible.filter((item) => !item.parentId);
    }

    if (currentPath === STARRED_PATH) {
      return favoriteFileIds
        .map((id) => visible.find((item) => item.id === id))
        .filter((item): item is FileNode => Boolean(item));
    }

    if (currentPath === RECENT_PATH) {
      return recentFileIds
        .map((id) => visible.find((item) => item.id === id))
        .filter((item): item is FileNode => Boolean(item));
    }

    if (currentPath === TRASH_PATH) {
      return allFiles.filter((item) => isTrashed(item));
    }

    return visible.filter((item) => item.parentId === currentPath);
  }, [allFiles, currentPath, favoriteFileIds, recentFileIds]);

  const items = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = baseItems.filter((item) => {
      if (currentPath !== TRASH_PATH && isTrashed(item)) {
        return false;
      }
      if (filterType !== "all" && !fileTypeMatches(item, filterType)) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return `${item.name} ${item.type} ${item.mimeType || ""}`.toLowerCase().includes(keyword);
    });

    return sortItems(filtered, sortBy, sortDirection);
  }, [baseItems, currentPath, filterType, searchQuery, sortBy, sortDirection]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(allFiles, currentPath), [allFiles, currentPath]);
  const summary = useMemo(() => buildSummary(allFiles), [allFiles]);

  const refresh = async () => {
    await loadWorkspace(currentPath);
  };

  const navigateTo = (path: string) => {
    if (path !== currentPath) {
      setCurrentPath(path);
      setSelection(new Set());
    }
  };

  const navigateHome = () => navigateTo("");

  const navigateUp = async () => {
    if (!currentPath || isVirtualPath(currentPath)) {
      navigateHome();
      return;
    }

    try {
      const current = unwrap(await FileService.getFileById(currentPath), "Failed to load drive item");
      if (!current || !current.parentId) {
        navigateHome();
        return;
      }
      navigateTo(current.parentId);
    } catch (error) {
      console.error("[DriveStore] navigateUp failed:", error);
      navigateHome();
    }
  };

  const createFolder = async (name: string) => {
    if (!name.trim() || isVirtualPath(currentPath)) {
      return;
    }
    await unwrap(await FileService.createFolder(currentPath || null, name.trim()), "Failed to create folder");
    await refresh();
  };

  const uploadFiles = async (files?: File[]) => {
    if (isVirtualPath(currentPath)) {
      return;
    }

    const selectedFiles = files && files.length > 0 ? files : null;
    if (!selectedFiles && typeof document === "undefined") {
      return;
    }

    let uploadList = selectedFiles;
    if (!uploadList) {
      uploadList = await new Promise<File[]>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.style.display = "none";
        input.onchange = () => {
          resolve(Array.from(input.files || []));
          input.remove();
        };
        document.body.appendChild(input);
        input.click();
      });
    }

    if (!uploadList || uploadList.length === 0) {
      return;
    }

    for (const file of uploadList) {
      await unwrap(
        await FileService.uploadFile(currentPath || null, {
          name: file.name,
          size: file.size,
          type: detectFileType(file),
        }),
        "Failed to upload file",
      );
    }

    await refresh();
  };

  const deleteItems = async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    await unwrap(await FileService.deleteFiles(ids), "Failed to move files to trash");
    await refresh();
  };

  const purgeItems = async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    await unwrap(await FileService.purgeFiles(ids), "Failed to permanently delete files");
    await refresh();
  };

  const restoreItems = async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    await unwrap(await FileService.restoreFiles(ids), "Failed to restore files");
    await refresh();
  };

  const emptyTrash = async () => {
    await unwrap(await FileService.emptyTrash(), "Failed to empty trash");
    await refresh();
  };

  const renameItem = async (id: string, newName: string) => {
    if (!newName.trim()) {
      return;
    }
    await unwrap(await FileService.renameFile(id, newName.trim()), "Failed to rename file");
    await refresh();
  };

  const moveItems = async (ids: string[], targetFolderId: string) => {
    if (ids.length === 0) {
      return;
    }
    await unwrap(await FileService.moveFiles(ids, targetFolderId || null), "Failed to move files");
    await refresh();
  };

  const toggleStar = async (id: string) => {
    await unwrap(await FileService.toggleStar(id), "Failed to toggle star");
    setFavoriteFileIds(FileService.getFavoriteFileIds());
    await refresh();
  };

  const downloadItems = async (ids: string[]) => {
    if (ids.length === 0 || typeof document === "undefined") {
      return;
    }

    const idSet = new Set(ids);
    const targets = allFiles.filter((item) => idSet.has(item.id) && item.type !== "folder");
    for (const item of targets) {
      const source = item.previewUrl || item.url;
      if (!source) {
        continue;
      }

      try {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to download ${item.name}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = item.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        const anchor = document.createElement("a");
        anchor.href = source;
        anchor.download = item.name;
        anchor.target = "_blank";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    }
  };

  const markOpened = (id: string) => {
    FileService.markFileOpened(id);
    setRecentFileIds(FileService.getRecentFileIds());
  };

  const openItem = async (item: FileNode) => {
    if (item.type === "folder") {
      navigateTo(item.id);
      return;
    }
    markOpened(item.id);
  };

  const toggleSelection = (id: string, multi: boolean) => {
    setSelection((previous) => {
      const next = new Set(multi ? previous : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelection(new Set(items.map((item) => item.id)));
  };

  const clearSelection = () => setSelection(new Set());

  const value: DriveStoreContextValue = {
    currentPath,
    items,
    allFiles,
    stats,
    summary,
    breadcrumbs,
    favoriteFileIds,
    recentFileIds,
    isLoading,
    viewMode,
    sortBy,
    sortDirection,
    filterType,
    searchQuery,
    selection,
    isVirtualView: isVirtualPath(currentPath),
    isTrashView: currentPath === TRASH_PATH,
    isStarredView: currentPath === STARRED_PATH,
    isRecentView: currentPath === RECENT_PATH,
    setViewMode,
    setSort: (option, direction) => {
      setSortBy(option);
      setSortDirection(direction);
    },
    setFilterType,
    setSearchQuery,
    navigateTo,
    navigateHome,
    navigateUp,
    refresh,
    createFolder,
    uploadFiles,
    deleteItems,
    purgeItems,
    restoreItems,
    emptyTrash,
    renameItem,
    moveItems,
    toggleStar,
    downloadItems,
    openItem,
    markOpened,
    toggleSelection,
    selectAll,
    clearSelection,
  };

  return <DriveStoreContext.Provider value={value}>{children}</DriveStoreContext.Provider>;
}

export function useDriveStore() {
  const context = useContext(DriveStoreContext);
  if (!context) {
    throw new Error("useDriveStore must be used within DriveStoreProvider");
  }
  return context;
}

export const DriveVirtualPaths = {
  trash: TRASH_PATH,
  starred: STARRED_PATH,
  recent: RECENT_PATH,
} as const;
