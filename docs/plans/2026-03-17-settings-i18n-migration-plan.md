# Settings Page i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the settings page to rely entirely on `@sdkwork/openchat-pc-i18n` for all visible copy and make the language selector update the shared runtime state (persisted to `openchat.locale`) among `zh-CN` and `en-US`.

**Architecture:** The settings page and i18n runtime already exist in werkspaces. We will keep the translations centralized in `packages/sdkwork-openchat-pc-i18n` and annotate `SettingsPage.tsx` with the shared translation helpers, while wiring the language switcher to `setAppLanguage` so every other consumer automatically sees the updated locale.

**Tech Stack:** React + TypeScript (packages scoped via pnpm workspace), `i18next` runtime, and Vitest/tsc for verification.

---

### Task 1: Replace literal strings in SettingsPage with translation helpers

**Files:**
- Modify: `/abs/path/packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx`

**Step 1: Add the shared translation helper**
- Import `useAppTranslation` (or `tr`/`setAppLanguage`) from `@sdkwork/openchat-pc-i18n`.
- Define translation key constants for tabs, sections, buttons, placeholders, validation/error messages, account history labels, status text, and IM config helper copy.

**Step 2: Replace every user-facing literal**
- Swap `settingTabItems` labels, headings, button text, and helper copy with `tr("settings.tab.account")` etc.
- Call `tr` wherever `setSaveMessage` currently uses a hard-coded English string.
- Convert `formatDateTime` helpers to use the runtime `formatDateTime` or `useAppTranslation().formatDateTime` as necessary for any timestamps.
- Ensure all placeholders (`"User UID for SDK auth"`, `"IM token"`, feedback placeholders, etc.) use translation keys.
- Update the language `<select>` to render options for `zh-CN` and `en-US`, and call `setAppLanguage(nextLocale)` from the shared runtime when the user switches languages; also remove duplicate logic that stores custom keys.

**Step 3: Verify local type safety**
- Run `pnpm --filter @sdkwork/openchat-pc-settings run typecheck` to ensure the file still passes TypeScript validation after replacing strings.
- Expected output: `tsc --noEmit -p tsconfig.json` exits with code 0 and no errors.

**Step 4: Stage progress**
- `git add packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx`
- `git commit -m "feat(settings): internationalize settings page strings"` (if committing per policy).

### Task 2: Extend i18n resources with new keys

**Files:**
- Modify: `/abs/path/packages/sdkwork-openchat-pc-i18n/src/resources/zh-CN.ts`
- Modify: `/abs/path/packages/sdkwork-openchat-pc-i18n/src/resources/en-US.ts`

**Step 1: Enumerate keys**
- List all translation keys referenced from Task 1 and ensure each has entries in both `zh-CN` and `en-US`.
- Use `tr("settings.general.heading.appearance")`, `tr("settings.notifications.dnd.start")`, `tr("settings.feedback.type.label")`, etc., to keep key structure consistent.

**Step 2: Populate translations**
- Fill in human-readable strings: Chinese text in `zh-CN.ts` (using simplified Chinese) and English text in `en-US.ts`.
- Ensure `en-US.ts` is no longer empty.

**Step 3: Confirm runtime exports**
- No runtime changes are necessary unless new helpers are required, but verify `packages/sdkwork-openchat-pc-i18n/src/index.ts` still exports `useAppTranslation`, `setAppLanguage`, etc.

**Step 4: Re-run typecheck**
- Run `pnpm --filter @sdkwork/openchat-pc-i18n run typecheck` or the root `pnpm run typecheck:packages` if affordable.

**Step 5: Stage resource changes**
- `git add packages/sdkwork-openchat-pc-i18n/src/resources/zh-CN.ts packages/sdkwork-openchat-pc-i18n/src/resources/en-US.ts`

### Task 3: Validate runtime behavior

**Files:**
- (No file modifications; validation task.)

**Step 1: Run workspace verification**
- Execute `pnpm run typecheck:packages` (or at minimum `pnpm --filter @sdkwork/openchat-pc-settings run typecheck` plus i18n typecheck).
- Expect: All packages typecheck with zero errors.

**Step 2: Document results**
- Capture command outputs for the final report so we can cite validation completed.

**Step 3: Stage nothing (validation only).**

---

Plan complete and saved to `docs/plans/2026-03-17-settings-i18n-migration-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - I continue in this session, spawning fresh subagents per task if needed, with review after each.
2. **Parallel Session (separate worktree)** - Start a new session/worktree using `superpowers:executing-plans` and continue there (not chosen here).

Which approach should we take?
