import { memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export const Announcer = memo(() => {
  return (
    <>
      <div id="aria-live-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="aria-live-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
    </>
  );
});

Announcer.displayName = "Announcer";

export const SkipLink = memo(() => {
  const { tr } = useAppTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#0EA5E9] focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:ring-offset-2"
    >
      {tr("Skip to main content")}
    </a>
  );
});

SkipLink.displayName = "SkipLink";

export default Announcer;
