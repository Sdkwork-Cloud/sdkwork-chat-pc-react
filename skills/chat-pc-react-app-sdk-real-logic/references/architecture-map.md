# Chat PC React Architecture Map

## Stack

- React + TypeScript + Vite
- pnpm workspace with per-domain desktop packages
- Tauri desktop host

## Standard Remote Path

Use this path for any business capability backed by `spring-ai-plus-app-api`:

`src shell / package services index -> package services sdk-adapter -> @sdkwork/app-sdk -> spring-ai-plus-app-api`

Each feature package owns its adapter boundary in `src/services/sdk-adapter.ts`, but all app business calls must still converge on the shared generated SDK.

## Local And Native Path

Keep these concerns on their original boundaries:

- Tauri commands and desktop plugin bridges
- local files, device integration, terminal, RTC, and native process work
- provider-specific SDKs that do not represent app business contracts
- workspace tooling and package orchestration

Local-only capability should stay local even while adjacent business modules move to the generated SDK.

## Replace Or Remove

- raw REST helpers in package services
- duplicate DTO mapping that only exists to hide a missing SDK method
- vendor-SDK business calls that should come from app-api contracts
- manual auth header assignment in service layers

## Contract Closure Rule

If a feature package needs a method that the generated app SDK does not expose:

1. Fix the contract in `spring-ai-plus-app-api` and required backend modules.
2. Regenerate the shared app SDK from the repository-standard generator flow.
3. Reconnect the package through `src/services/sdk-adapter.ts`.
4. Delete the temporary bypass.

If that backend work would touch schema, migration, or embedded DB layout, pause and ask the user first.
