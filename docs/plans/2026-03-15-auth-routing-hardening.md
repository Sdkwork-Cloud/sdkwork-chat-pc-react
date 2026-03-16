# Auth Routing Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move authentication flow back into the router so protected modules, guest pages, and route guards behave as designed.

**Architecture:** Implement real route-guard behavior using persisted auth state from the auth package, expose auth screens through explicit routes, and update the app shell to choose layout by route instead of bypassing routing entirely. Cover redirect behavior with focused Vitest route tests.

**Tech Stack:** React Router, Vitest, TypeScript, pnpm workspace auth package

---

### Task 1: Lock redirect behavior with tests

**Files:**
- Create: `src/tests/router.auth-guard.test.tsx`

**Step 1: Write the failing test**

Cover:
- unauthenticated `/chat` redirects to `/login`
- authenticated `/login` redirects to `/chat`
- auth guard and permission guard return expected route decisions

**Step 2: Run test to verify it fails**

Run: `pnpm.cmd exec vitest run src/tests/router.auth-guard.test.tsx`
Expected: FAIL because the router does not yet expose auth routes/real guards.

### Task 2: Implement router-level auth flow

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/router/guards/index.ts`
- Modify: `src/router/routes.ts`
- Modify: `src/app/App.tsx`
- Modify: `packages/sdkwork-openchat-pc-auth/src/AuthPage.tsx`

**Step 1: Implement persisted-session auth guard**

Use auth storage to distinguish guest/public/private routes and support redirect targets.

**Step 2: Add explicit auth routes**

Expose `/login`, `/register`, and `/forgot-password` through router entries.

**Step 3: Stop bypassing router in app shell**

Choose layout by route so auth pages render without the main shell while protected pages stay inside `MainLayout`.

### Task 3: Verify focused behavior

**Files:**
- Modify: `src/tests/router.auth-guard.test.tsx`

**Step 1: Run focused test**

Run: `pnpm.cmd exec vitest run src/tests/router.auth-guard.test.tsx`
Expected: PASS.

**Step 2: Run route smoke tests**

Run: `pnpm.cmd exec vitest run src/tests/router.page-loader.test.ts src/tests/router.dynamic-routes.test.tsx src/tests/router.layout-shell.test.tsx`
Expected: PASS.
