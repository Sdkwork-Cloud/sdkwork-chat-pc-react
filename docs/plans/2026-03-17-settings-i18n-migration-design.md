## Summary
- The goal is to migrate `packages/sdkwork-openchat-pc-settings` to rely on the shared `@sdkwork/openchat-pc-i18n` runtime for every user-facing string, ensure the settings page honors runtime language selection, and keep the localized experience confined to `zh-CN` and `en-US`.
- I will only touch the settings package and the i18n resources/runtime because the assignment explicitly boundaries the work set.

## Requirements
- Replace all literal strings in `SettingsPage.tsx` (component labels, buttons, form placeholders, section headings, status/error messages) with translation keys and render them via `tr(...)` or helpers from `useAppTranslation`.
- Hook language selection UI so that changing the language calls `setAppLanguage`, persists via the shared runtime storage key, and reflects only the supported languages (`zh-CN`, `en-US`).
- Augment `packages/sdkwork-openchat-pc-i18n` resources (`zh-CN.ts`, `en-US.ts`) to cover the new keys used by the settings page, and ensure the runtime exports remain correct.
- Do not add or remove files outside of the allowed set; implement everything within `packages/sdkwork-openchat-pc-settings` and `packages/sdkwork-openchat-pc-i18n`.

## Constraints & Assumptions
- The root shell and other packages have already been wired into the shared runtime by earlier work; this change must only improve the settings page and i18n package resources.
- All strings currently shown to users (tabs, headings, buttons, status messages) should be translated; even messages set via `setSaveMessage`, error handling, etc., must come from translation keys.
- Helper formatters (e.g., `formatDateTime`) should replace manual `.toLocaleString()` usage where needed.
- Language persistence should happen through `setAppLanguage` so existing consumers of `getAppLanguage` continue to work; no additional storage layers should be added beyond the runtime key.
- Comments that currently contain Chinese text must also be translated or removed.

## Approach Options
1. **Minimal live-change**: Keep `SettingsPage` mostly as-is but wrap each literal with `tr(...)` using inline keys, and manually call `setAppLanguage` from the language `<select>`. This limits refactors but still covers the requirements. Downsides: lots of repetition and manual `tr` strings might become hard to maintain.
2. **Structured translation + runtime binding (recommended)**: Import `useAppTranslation` from the shared runtime and store tabs/section captions as `translationKeys` (maybe via constants). Replace all text with `tr("settings.tabs.account")`, `tr("settings.notifications.dnd")`, etc., and update the resource files with the same keys. Hook the language selector to `setAppLanguage` and persist as required, also using `formatDateTime` helper for any timestamp display. This keeps the settings page idiomatic and ensures all strings have fallback keys.
3. **Context-driven locale provider**: Create a small wrapper/context that precomputes translation keys/labels, then supply them to `SettingsPage` components. This adds complexity and falls outside the allowed scope.

## Recommendation
- Follow approach 2. It balances maintainability and completeness while staying within the permitted files: `SettingsPage.tsx` will import `useAppTranslation`, define tab items via keys, use `tr` for all strings, and call `setAppLanguage` when the language `<select>` changes. The resource files will grow but remain structured, and runtime will already be wired. Because the user asked for a “perfect” internationalization, this approach ensures every UI string is translated and the language choice is persistent.

## Validation
- After translating, ensure `packages/sdkwork-openchat-pc-settings` still builds by running `pnpm run typecheck` within the settings package if time allows (permitted by scope). If broader workspace verification is too heavy, at minimum rely on the workspace already being configured with the runtime.

