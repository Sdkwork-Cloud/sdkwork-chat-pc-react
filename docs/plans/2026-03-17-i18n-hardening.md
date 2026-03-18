# I18n Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a workspace-wide internationalization system that supports runtime language requests, default language selection, locale-aware formatting, and full removal of hardcoded Chinese from runtime code outside translation resources.

**Architecture:** Keep the i18n runtime centralized so the app shell controls language detection, persistence, and resource registration, while exposing shared translation and locale-formatting helpers from `@sdkwork/openchat-pc-commons` so every package can consume the same runtime. Migrate user-facing strings in package components/pages to translation keys, remove Chinese comments from code, and add audit tests to prevent regressions.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, i18next, react-i18next, i18next-browser-languagedetector, Tauri

---

### Task 1: Build shared i18n runtime and locale formatting helpers

**Files:**
- Modify: `src/i18n/index.ts`
- Create: `src/i18n/resources/en-US.ts`
- Create: `src/i18n/resources/zh-CN.ts`
- Create: `packages/sdkwork-openchat-pc-commons/src/i18n/index.ts`
- Modify: `packages/sdkwork-openchat-pc-commons/src/index.ts`
- Modify: `packages/sdkwork-openchat-pc-commons/src/lib/utils.ts`
- Modify: `src/vite-env.d.ts`

**Step 1: Write failing tests**

Add runtime tests that assert:
- the default language resolves to a supported locale
- a querystring or stored language can override the default
- locale formatting helpers respect the active language

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/i18n.runtime.test.ts`
Expected: FAIL because shared i18n helpers and runtime expectations are not implemented yet.

**Step 3: Write minimal implementation**

Implement:
- supported locales and normalization helpers
- centralized i18n initialization with query/localStorage/browser detection
- default language env support
- document `lang`/`dir` sync
- shared locale-aware formatting helpers exported from `@sdkwork/openchat-pc-commons`

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/i18n.runtime.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/i18n src/vite-env.d.ts packages/sdkwork-openchat-pc-commons/src
git commit -m "feat(i18n): add shared runtime and locale helpers"
```

### Task 2: Internationalize root shell and navigation

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/AppProvider.tsx`
- Modify: `src/router/index.tsx`
- Modify: `packages/sdkwork-openchat-pc-commons/src/shell/Sidebar.tsx`
- Test: `src/tests/sidebar.navigation.test.ts`
- Test: `src/tests/router.layout-shell.test.tsx`

**Step 1: Write failing test**

Add tests covering:
- shell loading/error strings resolve through i18n
- sidebar labels remain route-safe and can render after language changes

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx`
Expected: FAIL because current shell strings are hardcoded.

**Step 3: Write minimal implementation**

Wire shell components to `useAppTranslation`, localize route loading/error text, and keep route contract tests stable by asserting paths/ids instead of English labels.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app src/router packages/sdkwork-openchat-pc-commons/src/shell src/tests
git commit -m "feat(i18n): localize app shell and navigation"
```

### Task 3: Migrate package UI hotspots to translation keys

**Files:**
- Modify package `src/components/*` and `src/pages/*` files with hardcoded display text, starting with:
  - `packages/sdkwork-openchat-pc-auth/src/pages/LoginPage.tsx`
  - `packages/sdkwork-openchat-pc-agent/src/components/AgentChat.tsx`
  - `packages/sdkwork-openchat-pc-agent/src/components/MemoryPanel.tsx`
  - `packages/sdkwork-openchat-pc-contacts/src/components/*.tsx`
  - `packages/sdkwork-openchat-pc-im/src/components/*.tsx`
  - `packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx`
  - `packages/sdkwork-openchat-pc-communication/src/pages/CallsPage.tsx`
  - `packages/sdkwork-openchat-pc-device/src/pages/*.tsx`
  - `packages/sdkwork-openchat-pc-rtc/src/components/CallModal.tsx`
- Extend: `src/i18n/resources/en-US.ts`
- Extend: `src/i18n/resources/zh-CN.ts`

**Step 1: Write failing tests**

Add or update targeted UI tests to assert translated labels/placeholders render in both `en-US` and `zh-CN` for representative package pages/components.

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/auth.public-api.test.ts src/tests/user.me.page.test.tsx src/tests/communication.calls.page.test.tsx`
Expected: FAIL or miss assertions until package UIs are translated.

**Step 3: Write minimal implementation**

Replace hardcoded UI strings with translation keys and swap ad-hoc `toLocale*` usage to shared locale formatting helpers.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/auth.public-api.test.ts src/tests/user.me.page.test.tsx src/tests/communication.calls.page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add packages src/i18n/resources src/tests
git commit -m "feat(i18n): translate package pages and components"
```

### Task 4: Remove Chinese comments and add regression audits

**Files:**
- Modify runtime code files in `src/`, `packages/`, `tests/`, `src-tauri/src/` that still contain Chinese comments
- Create: `src/tests/i18n.audit.test.ts`
- Modify: `tests/setup.ts`

**Step 1: Write failing test**

Create an audit test that scans runtime code and fails if:
- Chinese characters appear outside translation resource files and approved fixtures
- hardcoded `zh-CN` locale formatting calls remain in UI/runtime files

**Step 2: Run test to verify it fails**

Run: `pnpm run test -- src/tests/i18n.audit.test.ts`
Expected: FAIL because Chinese comments and locale-specific hardcoding still exist.

**Step 3: Write minimal implementation**

Remove or rewrite Chinese comments to English, clean remaining hardcoded locale formatting, and keep translation resources as the only place containing Chinese copy.

**Step 4: Run test to verify it passes**

Run: `pnpm run test -- src/tests/i18n.audit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src packages tests src-tauri
git commit -m "test(i18n): audit translated runtime code"
```

### Task 5: Verify end-to-end behavior

**Files:**
- No new source files expected

**Step 1: Run targeted verification**

Run:
- `pnpm run test -- src/tests/i18n.runtime.test.ts src/tests/i18n.audit.test.ts src/tests/sidebar.navigation.test.ts src/tests/router.layout-shell.test.tsx`
- `pnpm run typecheck`

Expected:
- all targeted tests PASS
- typecheck exits 0

**Step 2: Run broader package verification**

Run:
- `pnpm run test`
- `pnpm run typecheck:packages`
- `pnpm run verify:packages`

Expected:
- no failing tests
- no package type errors
- package boundary verification passes

**Step 3: Commit**

```bash
git add .
git commit -m "chore(i18n): verify workspace internationalization hardening"
```
