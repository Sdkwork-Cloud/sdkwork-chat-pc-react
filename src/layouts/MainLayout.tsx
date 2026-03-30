import { type ReactNode } from "react";
import { useAppStore } from "@sdkwork/openchat-pc-core";
import {
  MainLayout as ShellMainLayout,
  WindowControls,
  type WindowControlsController,
} from "@sdkwork/openchat-pc-commons";
import { getPlatform } from "../platform";

interface MainLayoutProps {
  children: ReactNode;
}

function resolveWindowController(): WindowControlsController | null {
  try {
    return getPlatform();
  } catch {
    return null;
  }
}

export function MainLayout({ children }: MainLayoutProps) {
  const hiddenSidebarItems = useAppStore((state) => state.hiddenSidebarItems);
  const controller = resolveWindowController();

  return (
    <ShellMainLayout
      hiddenSidebarItems={hiddenSidebarItems}
      windowControls={(
        <WindowControls
          controller={controller}
          variant="floating"
          className="absolute right-4 top-4 z-30 w-auto"
        />
      )}
    >
      {children}
    </ShellMainLayout>
  );
}

export default MainLayout;
