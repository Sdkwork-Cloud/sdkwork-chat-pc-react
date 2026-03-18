# Full i18n Migration Design

**Goal:** move the app from root-only i18n bootstrap to a package-consumable internationalization system that supports runtime language selection, default locale configuration, shared locale-aware formatting, and removal of Chinese hardcoded UI strings/comments in the touched runtime code.

## Current State

- `src/i18n/index.ts` initializes `i18next`, but nearly all `packages/*` UI still renders hardcoded text.
- Locale resources in `src/i18n/locales` cover only a small fraction of the rendered UI.
- Shared shell and feature pages render user-facing strings directly in components and service-owned data.
- Tests render package pages directly, so package-level i18n must work without relying on the root shell bootstrap.
- Some files contain mojibake-style comments or non-UTF8-looking text when read through PowerShell, so migration must replace malformed text instead of preserving it.

## Target Architecture

### Shared package

Create `packages/sdkwork-openchat-pc-i18n` as the single runtime entry for:

- `i18next` initialization
- locale detection and persistence
- React translation hooks for workspace packages
- locale-aware `Intl` formatting helpers
- shared translation resources

This keeps `src/` thin and lets all `packages` consume i18n through a workspace dependency instead of importing from the shell.

### Translation pattern

Use source English text as the translation key for runtime UI copy:

- `tr("Login")`
- `tr("Opened {{label}}.", { label })`

Rationale:

- reduces key naming overhead during a large migration
- keeps English as readable default text in code
- allows fast conversion of existing hardcoded strings
- works well with a flat Chinese resource dictionary

Configure i18next with `keySeparator: false` and `nsSeparator: false` so literal sentences remain valid keys.

### Locale flow

1. Resolve locale from explicit request sources in this order:
   - URL query `lang`
   - persisted app locale in `localStorage`
   - browser language
   - configured default locale
2. Initialize i18next once in the shared package.
3. Expose `setAppLanguage()` to persist and apply a new locale.
4. Keep `document.documentElement.lang` synchronized with the resolved locale.
5. Wire the Settings page language preference to the shared setter.

### Formatting

Provide helpers from the shared i18n package:

- `formatDate`
- `formatTime`
- `formatDateTime`
- `formatNumber`

Pages should stop calling raw `toLocaleString()` / `toLocaleTimeString()` directly so formatting stays aligned with the active app locale.

## Migration Scope

### Phase 1

- shared i18n package
- root bootstrap integration
- test bootstrap integration
- shell strings (`App`, router loading/error UI, sidebar)
- auth pages
- route pages with direct user-facing operational text

### Phase 2

- highest-impact shared components and Chinese-heavy feature components
- language switching in settings
- native shell labels in Tauri
- remaining Chinese comments in touched runtime files

### Phase 3

- iterate on additional package pages/components until the Chinese hardcoded scan for runtime files is materially reduced
- add regression tests for locale selection and translated rendering

## Tradeoffs

### Chosen

Dedicated workspace i18n package with shared helpers.

Benefits:

- packages can consume i18n cleanly
- testable outside the root shell
- maintainable future pattern for new modules

### Rejected

Keep all i18n in `src/i18n`.

Why rejected:

- packages cannot depend on root shell code cleanly
- tests for package pages would still lack consistent initialization
- architecture would remain root-centric and brittle

## Verification Strategy

- add i18n runtime tests
- update affected render tests to assert translated output under a known locale
- run `pnpm run test`
- run `pnpm run typecheck`
- run `pnpm run typecheck:packages`
- run `pnpm run verify:packages`
