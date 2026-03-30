# Claw Theme Foundation Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `sdkwork-chat-pc-react` theme tokens, UI foundation surfaces, and shell framework to the `claw-studio` standard without changing product behavior.

**Architecture:** Rebuild the runtime theme contract around `claw-studio`-style primary scales and semantic surfaces, then retune the shared UI package and shell layout so auth, overlays, navigation, and main content all render against the same standard. Keep business pages functionally intact and let shared tokens do most of the work.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, workspace packages, Vitest, Tauri/web dual runtime, shared UI and commons packages.

---

### Task 1: Lock the new standard with failing tests

**Files:**
- Modify: `src/tests/ui.foundation.audit.test.ts`
- Modify: `src/tests/app.shell.alignment.test.ts`
- Modify: `src/tests/router.layout-shell.test.tsx`

- [ ] **Step 1: Write the failing audit assertions**

Extend the audit so it verifies:

- `ThemeManager` publishes `--theme-primary-50` through `--theme-primary-950`
- shell layout references aligned surface classes rather than the legacy `bg-bg-*` full-screen shell only
- commons bridge files still proxy into `@sdkwork/openchat-pc-ui`

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts src/tests/app.shell.alignment.test.ts src/tests/router.layout-shell.test.tsx`

Expected: FAIL because the current theme runtime and shell still reflect the old standard.

- [ ] **Step 3: Tighten assertions to the real target**

Keep the tests strict enough that “similar but not aligned” does not pass.

- [ ] **Step 4: Re-run the focused tests**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts src/tests/app.shell.alignment.test.ts src/tests/router.layout-shell.test.tsx`

Expected: FAIL for the intended gaps only.

### Task 2: Rebuild the theme runtime around `claw-studio` primary scales

**Files:**
- Modify: `src/app/providers/ThemeManager.tsx`
- Modify: `packages/sdkwork-openchat-pc-ui/src/foundation/theme.tsx`

- [ ] **Step 1: Write a focused failing theme test if needed**

If audit coverage is not enough, add a focused assertion around the theme runtime output in the existing shell/theme tests.

- [ ] **Step 2: Implement brand-scale token output**

Update the theme runtime so selected theme colors publish:

- `--theme-primary-50`
- `--theme-primary-100`
- `--theme-primary-200`
- `--theme-primary-300`
- `--theme-primary-400`
- `--theme-primary-500`
- `--theme-primary-600`
- `--theme-primary-700`
- `--theme-primary-800`
- `--theme-primary-900`
- `--theme-primary-950`

Keep `data-theme`, `.dark`, and `system` mode behavior intact.

- [ ] **Step 3: Derive semantic app variables from the new scale**

Map brand tokens into:

- background surfaces
- text hierarchy
- border/ring variables
- overlay values
- scrollbar values
- shadow values

- [ ] **Step 4: Run focused verification**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts src/tests/app.shell.alignment.test.ts`

Expected: Theme assertions move to PASS or fail only on remaining CSS/shell gaps.

### Task 3: Replace global CSS with a `claw-studio`-aligned base layer

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Write the failing shell expectations first**

Use the existing alignment tests as the red step before editing CSS.

- [ ] **Step 2: Refactor `src/index.css`**

Reduce the file to:

- root theme defaults
- base body/html/root sizing
- scrollbar rules aligned to `claw-studio`
- selection styles
- motion helpers that are still needed
- product-specific editor exceptions only where unavoidable

Remove the current oversized AI-dark surface definitions that compete with shared components.

- [ ] **Step 3: Update Tailwind token aliases**

Make Tailwind color extensions consume the new semantic/runtime variables cleanly while supporting the `primary` scale naming expected by the aligned UI surfaces.

- [ ] **Step 4: Run focused verification**

Run: `pnpm run test -- src/tests/app.shell.alignment.test.ts src/tests/router.layout-shell.test.tsx`

Expected: PASS for global shell surface expectations, or only fail on component/layout gaps.

### Task 4: Retune shared UI surfaces to match `claw-studio`

**Files:**
- Modify: `packages/sdkwork-openchat-pc-ui/src/foundation/ui.tsx`
- Modify: `packages/sdkwork-openchat-pc-ui/src/index.ts`
- Modify: `packages/sdkwork-openchat-pc-commons/src/foundation/ui.tsx`
- Modify: `packages/sdkwork-openchat-pc-commons/src/foundation/theme.tsx`

- [ ] **Step 1: Use the current audit failures as the red step**

Confirm the focused tests are still red before changing component surfaces.

- [ ] **Step 2: Align button, input, textarea, select, checkbox, switch, badge, and card surfaces**

Update foundational controls to use:

- `claw-studio`-like white/zinc surfaces
- standard focus rings
- refined rounded geometry
- calmer shadow behavior
- consistent dark-mode surfaces

Preserve current prop contracts so business packages do not need broad rewrites.

- [ ] **Step 3: Align modal and drawer surfaces**

Retune overlays, headers, backdrops, and action rows to match `claw-studio` visual standards while preserving open/close behavior.

- [ ] **Step 4: Keep commons as a thin bridge**

Do not recreate a second foundation in commons; keep the bridge files pointing into `@sdkwork/openchat-pc-ui`.

- [ ] **Step 5: Run focused verification**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts`

Expected: PASS.

### Task 5: Rebuild the main shell and sidebar against the aligned framework

**Files:**
- Modify: `packages/sdkwork-openchat-pc-commons/src/shell/MainLayout.tsx`
- Modify: `packages/sdkwork-openchat-pc-commons/src/shell/Sidebar.tsx`
- Modify: `src/layouts/MainLayout.tsx`

- [ ] **Step 1: Use shell alignment tests as the red step**

Run the focused shell tests before editing.

- [ ] **Step 2: Refactor the shell frame**

Update the main layout so it mirrors `claw-studio` structure:

- root vertical shell container
- restrained ambient radial accents
- sidebar plus main content frame
- translucent main content surface instead of full-bleed hard background

- [ ] **Step 3: Refactor the sidebar language**

Keep the existing route map and “more” grouping behavior, but align the sidebar to the refined `claw-studio` navigation style instead of the current launcher-like icon rail.

- [ ] **Step 4: Keep desktop window controls working**

Preserve current desktop-only controls and placement, adapting them into the new shell without losing functionality.

- [ ] **Step 5: Run focused verification**

Run: `pnpm run test -- src/tests/app.shell.alignment.test.ts src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx`

Expected: PASS.

### Task 6: Align auth, loading, and non-business wrapper states

**Files:**
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/router/index.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/AuthPage.tsx`

- [ ] **Step 1: Use the layout/shell tests as the red step**

Confirm current wrapper-state visuals are still the remaining mismatch.

- [ ] **Step 2: Align full-screen loading**

Retune the loading screen so it shares the same background layering and tone hierarchy as the new shell.

- [ ] **Step 3: Align auth route framing**

Make auth route wrappers use the same shell language as `claw-studio` auth surfaces without changing auth logic.

- [ ] **Step 4: Run focused verification**

Run: `pnpm run test -- src/tests/auth.page.alignment.test.ts src/tests/router.layout-shell.test.tsx`

Expected: PASS, or identify any remaining route-wrapper drift.

### Task 7: Polish remaining hotspots and validate the workspace

**Files:**
- Modify: any touched shell/theme file needed to resolve final mismatches

- [ ] **Step 1: Run targeted verification and inspect failures**

Run: `pnpm run test -- src/tests/ui.foundation.audit.test.ts src/tests/app.shell.alignment.test.ts src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx src/tests/auth.page.alignment.test.ts`

Expected: PASS.

- [ ] **Step 2: Run type checks**

Run: `pnpm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run package type checks**

Run: `pnpm run typecheck:packages`

Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm run test`

Expected: PASS.

- [ ] **Step 5: Run package boundary verification**

Run: `pnpm run verify:packages`

Expected: PASS.
