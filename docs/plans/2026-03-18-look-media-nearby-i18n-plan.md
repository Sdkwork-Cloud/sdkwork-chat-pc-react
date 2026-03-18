# Look/Media/Nearby i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tie every user-visible string on Look, Media Center, and Nearby pages to `@sdkwork/openchat-pc-i18n` via `useAppTranslation` so the UI already behaves with English-keyed localization.

**Architecture:** Each page already renders structured sections (header, sidebar, summary, actions). The plan injects `useAppTranslation` into each component, replaces literal copy with `tr(...)`, and adds any missing dependency on `@sdkwork/openchat-pc-i18n`.

**Tech Stack:** React + TypeScript frontend pages under the pnpm workspace, shared `@sdkwork/openchat-pc-i18n` runtime, Vitest.

---

### Task 1: Look page localization
**Files:**
- Modify: `packages/sdkwork-openchat-pc-look/src/pages/LookPage.tsx`
- Possibly modify: `packages/sdkwork-openchat-pc-look/package.json` (add `@sdkwork/openchat-pc-i18n`)
**Step 1: Add translation hook and wrap literals**
1. Introduce `useAppTranslation` in `LookPage`, call `tr(...)` for the header text, description, placeholder `Search presets by title or theme`, shortcut hint, empty state `No presets matched.`, stats labels (`Scale`, `Filtered`, `Themes`), preview text, action buttons, and the `actionMessage` log prefix.
**Step 2: Run focused i18n test suite**
1. Run `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/i18n.audit.test.ts` and verify it passes (it should already pass before code change, but this guards regression).
**Step 3: Apply code changes**
1. Update the component to use `tr(...)` and ensure `actionMessage` uses localized summary text when calling `notifyAction`.
**Step 4: Re-run tests**
1. Re-run the same `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/i18n.audit.test.ts` command to confirm nothing regressed.
**Step 5: Record progress**
1. `git add packages/sdkwork-openchat-pc-look/src/pages/LookPage.tsx packages/sdkwork-openchat-pc-look/package.json docs/plans/2026-03-18-look-media-nearby-i18n-plan.md`
2. `git commit -m "feat(i18n): localize look page strings"`

### Task 2: Media Center page localization
**Files:**
- Modify: `packages/sdkwork-openchat-pc-media/src/pages/MediaCenterPage.tsx`
- Possibly modify: `packages/sdkwork-openchat-pc-media/package.json` (add `@sdkwork/openchat-pc-i18n`)
**Step 1: Wrap strings with `tr(...)`**
1. Add `useAppTranslation` and replace header text, description, filter dropdown options (`All`, `Audio`, `Video`, `Podcast`), placeholder `Search channel`, shortcut hint, summary labels (`Total`, `Audio`, `Video`, `Podcast`), empty state `No channels matched.`, details panel strings (`Now Playing`, `Audience`, `Volume`, `State`), placeholders, action button labels and feedback strings (e.g., `Playback started.`, `Playback paused.`, `Volume set to {{value}}%.`, `Queue Next`, `Open Transcript`, etc.).
**Step 2: Run i18n tests**
1. Execute `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/i18n.audit.test.ts`.
**Step 3: Implement localizations**
1. Update `MediaCenterPage` to use `tr(...)` throughout, including `notifyAction` messages and button labels.
**Step 4: Re-run tests**
1. Repeat the same test command to ensure success.
**Step 5: Capture change**
1. `git add packages/sdkwork-openchat-pc-media/src/pages/MediaCenterPage.tsx packages/sdkwork-openchat-pc-media/package.json`
2. `git commit -m "feat(i18n): localize media center strings"`

### Task 3: Nearby page localization
**Files:**
- Modify: `packages/sdkwork-openchat-pc-nearby/src/pages/NearbyPage.tsx`
- Possibly modify: `packages/sdkwork-openchat-pc-nearby/package.json`
**Step 1: Replace literals with `tr(...)`**
1. Hook `useAppTranslation` and convert header copy, description, placeholder `Search workspace`, slider label `Max Distance: {{value}} km`, shortcut hint, summary card labels (`Spaces`, `Online`, `Nearest`, `Farthest`), empty state `No workspace matched.`, detail panel text (`Live activity`, `Distance`, `Category`, `Online`), map placeholder copy, and button labels (`Plan Route (Enter)`, `Join Activity`, `Save Workspace`). Localize `notifyAction` messages and `actionMessage`.
**Step 2: Run tests**
1. Execute `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/i18n.audit.test.ts`.
**Step 3: Apply localization code**
1. Implement the `tr(...)` updates and ensure sliders/logging still work.
**Step 4: Re-run tests**
1. Repeat the focused test command to confirm.
**Step 5: Commit**
1. `git add packages/sdkwork-openchat-pc-nearby/src/pages/NearbyPage.tsx packages/sdkwork-openchat-pc-nearby/package.json`
2. `git commit -m "feat(i18n): localize nearby page strings"`

### Completion note
Plan complete and saved to `docs/plans/2026-03-18-look-media-nearby-i18n-plan.md`. Two execution options:
1. **Subagent-Driven (this session)** — dispatch opt-in subagents per task with spec + quality reviews; requires `superpowers:subagent-driven-development`.
2. **Parallel Session** — open a new session using `superpowers:executing-plans`.
