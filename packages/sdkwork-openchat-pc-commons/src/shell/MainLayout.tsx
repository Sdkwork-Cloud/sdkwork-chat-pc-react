import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
  hiddenSidebarItems?: string[];
  windowControls?: ReactNode;
}

export function MainLayout({
  children,
  hiddenSidebarItems = [],
  windowControls = null,
}: MainLayoutProps) {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background: "radial-gradient(circle at top, var(--ai-primary-glow), transparent 68%)",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 w-80"
          style={{
            background:
              "radial-gradient(circle at left, color-mix(in srgb, var(--text-primary) 8%, transparent), transparent 72%)",
          }}
        />
      </div>
      {windowControls}
      <div className="relative z-10 flex min-h-0 w-full flex-1 overflow-hidden">
        <Sidebar hiddenItemIds={hiddenSidebarItems} />
        <main className="relative z-10 flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--bg-secondary)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
