import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export const EmptyContact = memo(function EmptyContact() {
  const { tr } = useAppTranslation();

  return (
    <div className="flex flex-1 items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)]">
          <svg className="h-12 w-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{tr("Select a contact")}</h3>
        <p className="mx-auto max-w-xs text-sm text-[var(--text-muted)]">
          {tr("Choose a friend or group from the sidebar to view details and available actions.")}
        </p>
      </div>
    </div>
  );
});

EmptyContact.displayName = "EmptyContact";
