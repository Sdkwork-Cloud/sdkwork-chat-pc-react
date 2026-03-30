import { ChevronRight, Clock3, Cloud, Star, Trash2 } from "lucide-react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button } from "@sdkwork/openchat-pc-ui";
import { useDriveStore, DriveVirtualPaths } from "../store/driveStore";

const VIRTUAL_LABELS = {
  [DriveVirtualPaths.starred]: { label: "Starred", icon: <Star size={15} />, color: "text-amber-400" },
  [DriveVirtualPaths.recent]: { label: "Recent", icon: <Clock3 size={15} />, color: "text-sky-400" },
  [DriveVirtualPaths.trash]: { label: "Trash", icon: <Trash2 size={15} />, color: "text-rose-400" },
} as const;

export function DriveBreadcrumbs() {
  const { tr } = useAppTranslation();
  const { currentPath, breadcrumbs, navigateHome, navigateTo } = useDriveStore();

  if (currentPath && currentPath in VIRTUAL_LABELS) {
    const virtual = VIRTUAL_LABELS[currentPath as keyof typeof VIRTUAL_LABELS];

    return (
      <div className="flex items-center gap-2 overflow-hidden text-sm">
        <Button
          variant="unstyled"
          onClick={navigateHome}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Cloud size={15} />
          <span className="text-xs font-medium">{tr("Drive")}</span>
        </Button>
        <ChevronRight size={12} className="text-text-muted" />
        <div className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${virtual.color} bg-bg-hover`}>
          {virtual.icon}
          <span className="text-xs font-medium">{tr(virtual.label)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-hidden text-sm text-text-secondary">
      <Button
        variant="unstyled"
        onClick={navigateHome}
        className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
          !currentPath ? "bg-bg-hover text-text-primary" : "hover:bg-bg-hover hover:text-text-primary"
        }`}
      >
        <Cloud size={15} />
        <span className="text-xs font-medium">{tr("My Drive")}</span>
      </Button>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={item.id}>
            <ChevronRight size={12} className="mx-0.5 inline-flex text-text-muted" />
            <Button
              variant="unstyled"
              disabled={isLast}
              onClick={() => !isLast && navigateTo(item.id || "")}
              className={`max-w-[180px] truncate rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                isLast ? "bg-bg-hover text-text-primary" : "hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {item.name}
            </Button>
          </span>
        );
      })}
    </div>
  );
}

export default DriveBreadcrumbs;
