# Repository Guidelines

## Project Structure & Module Organization
This app uses a pnpm workspace. Keep the shell thin in `src/` for bootstrap, router, layouts, providers, and i18n. Put product features in `packages/sdkwork-openchat-pc-*`, with shared code in `packages/sdkwork-openchat-pc-commons`, `-ui`, `-contracts`, and `-kernel`. Desktop-native integration lives in `src-tauri/`. Tests are mainly in `src/tests/`, with shared setup in `tests/setup.ts`.

## Build, Test, and Development Commands
Use `pnpm run dev` for the Vite web app and `pnpm run dev:desktop` for the Tauri shell. `pnpm run build` performs TypeScript compile plus production build. `pnpm run typecheck` checks the shell; `pnpm run typecheck:packages` checks all workspace packages. `pnpm run test` runs Vitest, `pnpm run verify:packages` enforces package boundaries, and `pnpm run report:modules` regenerates the module readiness audit.

## Coding Style & Naming Conventions
Use strict TypeScript and React function components. Prefer PascalCase for components such as `ChatPage.tsx`, camelCase for hooks and utilities such as `useAuth.ts`, and keep each package public API in `src/index.ts`. Inside `packages/`, do not import `@/...` or another package’s `/src/...`; use package imports like `@sdkwork/openchat-pc-commons`. Follow existing ESLint and Prettier rules via `pnpm run lint` and `pnpm run format`.

## Testing Guidelines
Vitest runs in `jsdom`. Name tests `*.test.ts`, `*.test.tsx`, or `*.spec.tsx`. Add focused tests for every new behavior, especially route integration, workspace models, and service contracts. Before opening a PR, run `pnpm run test`, `pnpm run typecheck:packages`, and `pnpm run verify:packages`.

## Commit & Pull Request Guidelines
Use Conventional Commits, for example `feat(im): improve chat workspace` or `fix(router): harden lazy page loading`. PRs should explain what changed, why it changed, impacted packages, validation commands, and screenshots for UI work.

## Agent-Specific Notes
Treat `docs/` as the design source of truth, but verify against actual routes, tests, and package exports before claiming a module is complete. Prefer adding or polishing features inside packages instead of expanding the root shell.
