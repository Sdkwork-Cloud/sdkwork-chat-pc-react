# Module Readiness Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a repeatable audit flow that compares documented modules against routed, tested, and implemented modules so product gaps stay visible.

**Architecture:** Add a small filesystem audit library under `scripts/`, cover its classification logic with Vitest, and generate a markdown report under `docs/reports/`. Pair that with a concise contributor guide so future work follows the same package and verification rules.

**Tech Stack:** Node.js ESM, Vitest, pnpm workspace scripts, Markdown docs

---

### Task 1: Lock readiness classification with tests

**Files:**
- Create: `src/tests/module.readiness.audit.test.ts`

**Step 1: Write the failing test**

Assert that a module with docs, pages, services, routes, tests, and workspace state is classified as `ready`, while a module lacking route/test coverage is classified as `implementation-gap`.

**Step 2: Run test to verify it fails**

Run: `pnpm.cmd exec vitest run src/tests/module.readiness.audit.test.ts`
Expected: FAIL because the audit helpers do not exist yet.

**Step 3: Write minimal implementation**

Create a small audit helper that derives status from module evidence.

**Step 4: Run test to verify it passes**

Run: `pnpm.cmd exec vitest run src/tests/module.readiness.audit.test.ts`
Expected: PASS.

### Task 2: Generate an actionable module readiness report

**Files:**
- Create: `scripts/module-readiness-lib.mjs`
- Create: `scripts/report-module-readiness.mjs`
- Modify: `package.json`

**Step 1: Add filesystem scan support**

Read workspace packages, router config, tests, and package READMEs to produce one readiness entry per package.

**Step 2: Add markdown report output**

Generate `docs/reports/module-readiness-report.md` with summary counts and a status matrix.

**Step 3: Wire a package script**

Add a root script such as `pnpm run report:modules`.

**Step 4: Run the report generator**

Run: `node scripts/report-module-readiness.mjs`
Expected: report file updates successfully.

### Task 3: Establish contributor guardrails

**Files:**
- Create: `AGENTS.md`

**Step 1: Add contributor guidance**

Document structure, key commands, package boundaries, testing expectations, and PR rules specific to this repository.

**Step 2: Keep it concise**

Stay within the requested guide scope and make examples concrete to this repo.

### Task 4: Verify the governance flow

**Files:**
- Modify: `docs/reports/module-readiness-report.md`

**Step 1: Run focused test**

Run: `pnpm.cmd exec vitest run src/tests/module.readiness.audit.test.ts`
Expected: PASS.

**Step 2: Run package verification**

Run: `pnpm.cmd run verify:packages`
Expected: PASS.

**Step 3: Run typecheck if needed**

Run: `pnpm.cmd typecheck`
Expected: PASS.
