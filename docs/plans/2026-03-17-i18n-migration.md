# Full i18n Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** build a package-consumable i18n system and migrate high-impact runtime UI strings/comments so packages render through shared internationalization instead of hardcoded text.

**Architecture:** add a new workspace package for i18n runtime/state/formatting, wire the shell and tests into that package, then migrate shell pages and Chinese-heavy package pages/components to use source-text translation keys plus locale-aware formatters.

**Tech Stack:** TypeScript, React, Vite, pnpm workspace, i18next, react-i18next, Vitest

---

### Task 1: Shared i18n package

**Files:**
- Create: `docs/plans/2026-03-17-i18n-migration-design.md`
- Create: `packages/sdkwork-openchat-pc-i18n/package.json`
- Create: `packages/sdkwork-openchat-pc-i18n/tsconfig.json`
- Create: `packages/sdkwork-openchat-pc-i18n/src/index.ts`
- Create: `packages/sdkwork-openchat-pc-i18n/src/runtime.ts`
- Create: `packages/sdkwork-openchat-pc-i18n/src/resources/en-US.ts`
- Create: `packages/sdkwork-openchat-pc-i18n/src/resources/zh-CN.ts`

**Step 1: Write the failing test**

Add a test that imports the shared i18n runtime and verifies locale switching plus default string fallback.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/i18n.runtime.test.ts`

**Step 3: Write minimal implementation**

Implement initialization, locale detection, persistence, `tr`, `useAppTranslation`, and formatter helpers.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/i18n.runtime.test.ts`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 2: Root bootstrap and test setup

**Files:**
- Modify: `src/i18n/index.ts`
- Modify: `src/main.tsx`
- Modify: `tests/setup.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Add/update tests to assert router/auth rendering under a deterministic locale.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/router.auth-guard.test.tsx`

**Step 3: Write minimal implementation**

Point the shell bootstrap to the shared package and initialize locale consistently in tests.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/router.auth-guard.test.tsx`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 3: Shell and navigation

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/router/index.tsx`
- Modify: `packages/sdkwork-openchat-pc-commons/src/shell/Sidebar.tsx`
- Modify: `packages/sdkwork-openchat-pc-commons/package.json`

**Step 1: Write the failing test**

Update route shell tests to assert translated loading/error/navigation text.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/router.layout-shell.test.tsx`

**Step 3: Write minimal implementation**

Replace shell hardcoded strings with shared translations and wire sidebar labels through i18n.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/router.layout-shell.test.tsx`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 4: Auth flows

**Files:**
- Modify: `packages/sdkwork-openchat-pc-auth/package.json`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/AuthPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/LoginPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/RegisterPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/pages/ForgotPasswordPage.tsx`

**Step 1: Write the failing test**

Update auth-related rendering assertions for translated UI text.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/router.auth-guard.test.tsx src/tests/auth.public-api.test.ts`

**Step 3: Write minimal implementation**

Replace hardcoded Chinese/English auth text with shared translations and remove Chinese comments in touched auth files.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/router.auth-guard.test.tsx src/tests/auth.public-api.test.ts`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 5: High-impact route pages

**Files:**
- Modify: `packages/sdkwork-openchat-pc-user/package.json`
- Modify: `packages/sdkwork-openchat-pc-user/src/pages/MePage.tsx`
- Modify: `packages/sdkwork-openchat-pc-communication/package.json`
- Modify: `packages/sdkwork-openchat-pc-communication/src/pages/CallsPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-settings/package.json`
- Modify: `packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx`

**Step 1: Write the failing test**

Update page tests that assert visible labels and placeholders.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/user.me.page.test.tsx src/tests/workspace.models.audit.test.ts`

**Step 3: Write minimal implementation**

Migrate visible route-page strings to shared translations and use locale-aware time formatting helpers.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/user.me.page.test.tsx src/tests/workspace.models.audit.test.ts`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 6: Chinese-heavy components and comments

**Files:**
- Modify: `packages/sdkwork-openchat-pc-agent/src/components/AgentChat.tsx`
- Modify: `packages/sdkwork-openchat-pc-agent/src/components/MemoryPanel.tsx`
- Modify: `packages/sdkwork-openchat-pc-contacts/src/components/*.tsx`
- Modify: `packages/sdkwork-openchat-pc-device/src/pages/DeviceListPage.tsx`
- Modify: `packages/sdkwork-openchat-pc-rtc/src/components/CallModal.tsx`
- Modify: touched files with Chinese comments in `src/`, `packages/`, and `tests/`

**Step 1: Write the failing test**

Add or update focused tests for translated placeholder/empty-state/action text where coverage exists.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/communication.calls.page.test.tsx src/tests/user.me.page.test.tsx`

**Step 3: Write minimal implementation**

Convert Chinese UI strings/comments in the highest-impact touched runtime files and add missing Chinese translations for their English source keys.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/communication.calls.page.test.tsx src/tests/user.me.page.test.tsx`

**Step 5: Commit**

Use a focused conventional commit after verification.

### Task 7: Full verification

**Files:**
- Modify as needed from previous tasks

**Step 1: Run focused tests**

Run: `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/router.auth-guard.test.tsx src/tests/user.me.page.test.tsx src/tests/communication.calls.page.test.tsx`

**Step 2: Run suite-level verification**

Run: `pnpm run test`

**Step 3: Run static verification**

Run: `pnpm run typecheck`

**Step 4: Run workspace verification**

Run: `pnpm run typecheck:packages`

**Step 5: Run package-boundary verification**

Run: `pnpm run verify:packages`
