# Service Conformance Report

Generated at: 2026-03-05T19:26:08.895Z (local)

## Summary

- Modules in scope: 23
- Passed: 23
- Failed: 0
- Service files: 88
- Interface declarations: 131
- ServiceResult API files: 22
- SDK adapter contract violations: 0
- Deep service export violations: 0
- Repository export violations: 0
- Direct fetch violations: 1
- Direct service deep-import violations: 0
- Priority modules async legacy-call violations: 0

## Matrix

| Package | Scope | Services | Index | SDK Adapter | SDK Contract | Service Barrel Export | Deep Svc Export | Repo Export | Service Files | Interfaces | ServiceResult APIs | Direct Fetch | Deep Import | Async Legacy Calls | Result Usage | Status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| sdkwork-openchat-pc-agent | Business | Y | Y | Y | Y | Y | N | N | 4 | 3 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-appstore | Business | Y | Y | Y | Y | Y | N | N | 3 | 3 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-auth | Business | Y | Y | Y | Y | Y | N | N | 3 | 15 | 0 | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-commerce | Business | Y | Y | Y | Y | Y | N | N | 4 | 6 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-commons | Infra | Y | Y | - | - | N | N | N | 14 | 43 | 0 | 1 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-contacts | Business | Y | Y | Y | Y | Y | N | N | 3 | 4 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-creation | Business | Y | Y | Y | Y | Y | N | N | 3 | 3 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-device | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-discover | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-drive | Business | Y | Y | Y | Y | Y | N | N | 3 | 3 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-im | Business | Y | Y | Y | Y | Y | N | N | 6 | 13 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-notification | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-rtc | Business | Y | Y | Y | Y | Y | N | N | 3 | 12 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-search | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-settings | Business | Y | Y | Y | Y | Y | N | N | 8 | 12 | 3* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-skill | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-social | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-terminal | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-tool | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-tools | Business | Y | Y | Y | Y | Y | N | N | 3 | 2 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-video | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-vip | Business | Y | Y | - | - | Y | N | N | 1 | 2 | 0 | 0 | 0 | 0 | Y | PASS |
| sdkwork-openchat-pc-wallet | Business | Y | Y | Y | Y | Y | N | N | 3 | 1 | 1* | 0 | 0 | 0 | Y | PASS |

## Notes

- Scope includes packages with `src/pages`/`src/hooks`; priority modules can also be scoped by `src/components` only.
- Infra packages are evaluated with relaxed export/fetch rules.
- Strict service boundary checks are enforced for business modules.
- `*` in ServiceResult column marks packages in strict runtime-contract scope.
- `SDK Contract` checks standardized sdk-adapter registry shape (`SDKAdapterBridge/register/get`).
- Some packages are exempt from sdk-adapter/ServiceResult runtime-contract checks by architecture policy.
- `Result Usage` currently applies to priority modules: appstore/auth/im/settings/creation/drive/tools/discover/wallet/notification/social/video/commerce/device/terminal/skill/tool/agent/search.
- `Deep Svc Export` and `Repo Export` columns highlight index-level boundary leakage risks.
