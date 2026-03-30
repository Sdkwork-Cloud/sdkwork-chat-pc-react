import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { AppRouter } from "../router";
import { useAuthContext } from "./AppProvider";

function FullScreenLoading({ label }: { label: string }) {
  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background: "radial-gradient(circle at top, var(--ai-primary-glow), transparent 68%)",
          }}
        />
      </div>
      <div className="relative z-10 flex items-center gap-3 rounded-[28px] border border-[color:var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4 shadow-[var(--shadow-xl)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
    </div>
  );
}

export function AppRoot() {
  const { isLoading } = useAuthContext();
  const { tr } = useAppTranslation();

  if (isLoading) {
    return <FullScreenLoading label={tr("Initializing...")} />;
  }

  return <AppRouter />;
}

export default AppRoot;
