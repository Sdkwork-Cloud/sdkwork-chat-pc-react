import { useEffect, type ReactNode } from "react";

interface DesktopProvidersProps {
  appName: string;
  children: ReactNode;
}

export function DesktopProviders({ appName, children }: DesktopProvidersProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-platform", "desktop");
    document.documentElement.setAttribute("data-desktop-shell", "openchat");
    document.title = appName;

    return () => {
      document.documentElement.removeAttribute("data-app-platform");
      document.documentElement.removeAttribute("data-desktop-shell");
    };
  }, [appName]);

  return <>{children}</>;
}
