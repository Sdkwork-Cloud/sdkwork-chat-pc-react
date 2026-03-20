# Shadcn UI Foundation Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified shadcn-style UI foundation in `@sdkwork/openchat-pc-ui`, bridge it through `@sdkwork/openchat-pc-commons`, and migrate business packages toward shared reusable controls and overlay/form patterns.

**Architecture:** `@sdkwork/openchat-pc-ui` becomes the single foundational source for reusable UI primitives and patterns. `@sdkwork/openchat-pc-commons` keeps only compatibility exports. Business packages migrate away from raw HTML controls and repeated modal/form scaffolding, with an audit test enforcing the rule.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, workspace packages, Vitest, existing CSS token system, shadcn-style component APIs.

---

### Task 1: Add the failing UI audit and migration guard

**Files:**
- Create: `src/tests/ui.foundation.audit.test.ts`
- Modify: `vitest.config.ts`

**Step 1: Write the failing test**

Create an audit test that scans `packages/**/src/**/*.{ts,tsx}` and fails when business packages outside approved UI foundation locations contain raw `<button>`, `<input>`, `<select>`, or `<textarea>` tags, or legacy overlay components that should come from the shared UI package.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts`

Expected: FAIL because many business packages still use raw controls.

**Step 3: Refine the allowlist**

Allow only the foundational UI package, compatibility files that must temporarily bridge exports, and any unavoidable low-level implementation files.

**Step 4: Re-run the focused test**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts`

Expected: still FAIL, but only for real migration targets.

### Task 2: Rebuild the shared UI foundation surface

**Files:**
- Modify: `packages/sdkwork-openchat-pc-ui/package.json`
- Modify: `packages/sdkwork-openchat-pc-ui/src/index.ts`
- Modify: `packages/sdkwork-openchat-pc-ui/src/foundation/ui.tsx`
- Modify: `packages/sdkwork-openchat-pc-ui/src/foundation/theme.tsx`
- Modify: `packages/sdkwork-openchat-pc-ui/src/foundation/toast.ts`
- Create: `packages/sdkwork-openchat-pc-ui/src/components/ui/index.ts`

**Step 1: Write or extend focused UI tests**

Add small tests for exported primitives or compatibility behavior if needed while reshaping APIs.

**Step 2: Run focused tests to confirm current gaps**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts`

Expected: FAIL with missing primitives and audit violations.

**Step 3: Implement the new shared UI API**

Expand the UI package so it exposes reusable primitives with native-prop-friendly APIs:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Switch`
- `Label`
- `Card` and card sections
- `Badge`
- `Separator`
- `Tabs`
- `Dialog`
- `Drawer`
- `Popover`
- `Tooltip`
- `DropdownMenu`
- `ModalButtonGroup`
- `Field`, `FieldGroup`, `EmptyState`, `StatusNotice`, `LoadingBlock`

Preserve theme and toast support, and keep `className` pass-through for migration ergonomics.

**Step 4: Add the shared toaster/provider wiring**

Expose a shared `Toaster` surface and integrate it with the app shell.

**Step 5: Run focused verification**

Run: `pnpm run typecheck`

Expected: PASS.

### Task 3: Collapse commons into a compatibility bridge

**Files:**
- Modify: `packages/sdkwork-openchat-pc-commons/src/index.ts`
- Modify: `packages/sdkwork-openchat-pc-commons/package.json`
- Optionally modify: `packages/sdkwork-openchat-pc-commons/src/components/ui/index.ts`

**Step 1: Inspect current exports**

Confirm which commons exports are truly used versus legacy duplicates.

**Step 2: Redirect shared UI exports**

Make `commons` re-export the new `ui` package surface and keep shell-specific exports only.

**Step 3: Preserve backward compatibility where needed**

Retain compatibility exports only if removing them would break existing package consumers during this migration.

**Step 4: Run verification**

Run: `pnpm run typecheck:packages`

Expected: PASS.

### Task 4: Migrate auth flows to shared UI primitives

**Files:**
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/LoginPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/RegisterPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/ForgotPasswordPage.tsx`
- Optionally modify: `packages/sdkwork-openchat-pc-auth/src/pages/AuthPage.tsx`
- Add/modify tests: auth page tests under `src/tests/`

**Step 1: Keep behavior the same**

Do not alter validation, countdown, reset, or submission algorithms unless a defect is exposed.

**Step 2: Replace raw controls**

Use shared `Button`, `Input`, `Textarea` if needed, `Checkbox`, `RadioGroup` or shared equivalents, `Field`, and shared feedback blocks.

**Step 3: Normalize action states**

Move loading, disabled, and error surface handling onto shared UI patterns.

**Step 4: Run focused tests**

Run: `pnpm run test -- src/tests/auth.public-api.test.ts src/tests/auth.service.token-storage.test.ts`

Expected: PASS.

### Task 5: Migrate settings workflows and high-density forms

**Files:**
- Modify: `packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-settings/src/components/SdkworkOpenclawPcDesktop.tsx`
- Modify: `packages/sdkwork-openchat-pc-settings/src/components/SdkworkOpenclawPcInstaller.tsx`
- Modify: `packages/sdkwork-openchat-pc-settings/src/components/SdkworkOpenclawPcSettings.tsx`
- Add/modify tests under `src/tests/`

**Step 1: Replace the local toggle and raw form controls**

Use shared `Switch`, `Select`, `Input`, `Textarea`, `Button`, `Field`, `SectionCard`, and status surfaces.

**Step 2: Preserve settings logic**

Do not break profile management, history rendering, account actions, IM config, or feedback flows.

**Step 3: Check action loops**

Confirm save, submit, update-check, copy, and binding actions still surface state and result feedback clearly.

**Step 4: Run focused tests**

Run: `pnpm run test -- src/tests/settings.feedback.service.test.ts`

Expected: PASS.

### Task 6: Migrate reusable modal and selector consumers

**Files:**
- Modify: `packages/sdkwork-openchat-pc-im/src/components/AddFriendModal.tsx`
- Modify: `packages/sdkwork-openchat-pc-im/src/components/CreateGroupModal.tsx`
- Modify: `packages/sdkwork-openchat-pc-im/src/components/NewNoteModal.tsx`
- Modify: `packages/sdkwork-openchat-pc-skill/src/components/SkillSelector.tsx`
- Modify: `packages/sdkwork-openchat-pc-tool/src/components/ToolSelector.tsx`

**Step 1: Replace remaining raw modal internals**

Ensure shared overlays also host shared form controls internally.

**Step 2: Normalize selector and prompt flows**

Use shared search, field, and footer action patterns.

**Step 3: Run relevant focused tests**

Run: `pnpm run test -- src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx`

Expected: PASS.

### Task 7: Migrate high-occurrence business pages

**Files:**
- Modify: `packages/sdkwork-openchat-pc-agent/src/pages/AgentMarketPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-agent/src/pages/AgentDetailPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-agent/src/components/AgentChat.tsx`
- Modify: `packages/sdkwork-openchat-pc-agent/src/components/MemoryPanel.tsx`
- Modify: `packages/sdkwork-openchat-pc-skill/src/pages/*.tsx`
- Modify: `packages/sdkwork-openchat-pc-tool/src/pages/*.tsx`
- Modify: `packages/sdkwork-openchat-pc-tools/src/pages/ToolsPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-appstore/src/pages/*.tsx`
- Modify: `packages/sdkwork-openchat-pc-commerce/src/pages/*.tsx`
- Modify: `packages/sdkwork-openchat-pc-wallet/src/pages/WalletPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-social/src/pages/MomentsPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-terminal/src/pages/TerminalPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-contacts/src/components/*.tsx`

**Step 1: Prioritize by raw-control count**

Start with packages contributing the most audit violations.

**Step 2: Replace raw controls with shared primitives**

Use shared buttons, inputs, selects, textareas, switches, badges, and overlay/panel patterns.

**Step 3: Refactor repeated layout fragments**

Extract recurring toolbars, section cards, and field groups into shared UI patterns when duplication is obvious across packages.

**Step 4: Run targeted tests after each cluster**

Run the relevant existing page tests for each migrated module cluster.

Expected: PASS for touched clusters.

### Task 8: Finish the audit, fix remaining drift, and verify the repo

**Files:**
- Modify: any remaining business package files still failing the audit
- Optionally modify: `src/app/AppProvider.tsx`
- Optionally modify: `src/app/App.tsx`

**Step 1: Integrate any shared provider wiring**

Make sure the shared toaster and shared UI providers are mounted at app level.

**Step 2: Run the audit until it passes or only approved exceptions remain**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts`

Expected: PASS.

**Step 3: Run the full verification suite**

Run:

- `pnpm run typecheck`
- `pnpm run typecheck:packages`
- `pnpm run test`
- `pnpm run verify:packages`

Expected: PASS.
