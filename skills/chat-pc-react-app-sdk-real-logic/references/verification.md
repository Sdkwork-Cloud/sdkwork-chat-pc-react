# Chat PC React Verification

Run the narrowest useful set first, then broaden before completion:

```bash
pnpm install
pnpm check:sdk-standard
pnpm audit:services
pnpm verify:packages
pnpm report:modules
pnpm typecheck:all
pnpm test
pnpm build
pnpm build:desktop
```

Use `pnpm build:desktop` when Tauri host code, filesystem bridges, or desktop packaging changes were touched. For package-only web work, the audits plus `pnpm build` are the minimum bar.
