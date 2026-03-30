import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('repository exposes a cross-platform desktop release workflow', () => {
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'release.yml');
  assert.equal(existsSync(workflowPath), true, 'missing .github/workflows/release.yml');

  const workflow = read('.github/workflows/release.yml');
  const gitPreparationCount =
    workflow.match(/node scripts\/prepare-shared-sdk-git-sources\.mjs/g)?.length ?? 0;
  const sharedSdkPreparationCount =
    workflow.match(/pnpm prepare:shared-sdk/g)?.length ?? 0;

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /build_environment:/);
  assert.match(workflow, /push:\s*[\s\S]*tags:\s*[\s\S]*release-\*/);
  assert.match(workflow, /verify-release:/);
  assert.match(workflow, /desktop-release:/);
  assert.match(workflow, /publish:/);
  assert.match(workflow, /windows-2022/);
  assert.match(workflow, /windows-11-arm/);
  assert.match(workflow, /ubuntu-24\.04/);
  assert.match(workflow, /ubuntu-24\.04-arm/);
  assert.match(workflow, /macos-15-intel/);
  assert.match(workflow, /macos-15/);
  assert.match(workflow, /target:\s*x86_64-pc-windows-msvc/);
  assert.match(workflow, /target:\s*aarch64-pc-windows-msvc/);
  assert.match(workflow, /target:\s*x86_64-unknown-linux-gnu/);
  assert.match(workflow, /target:\s*aarch64-unknown-linux-gnu/);
  assert.match(workflow, /target:\s*x86_64-apple-darwin/);
  assert.match(workflow, /target:\s*aarch64-apple-darwin/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_MODE:\s*git/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_APP_GIT_REF:\s*[0-9a-f]{40}/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_COMMON_GIT_REF:\s*[0-9a-f]{40}/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_APP_REPO_URL:\s*https:\/\/github\.com\/Sdkwork-Cloud\/sdkwork-sdk-app\.git/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_COMMON_REPO_URL:\s*https:\/\/github\.com\/Sdkwork-Cloud\/sdkwork-sdk-commons\.git/);
  assert.doesNotMatch(
    workflow,
    /uses:\s*pnpm\/action-setup@v4\s*\r?\n\s+with:\s*\r?\n\s+version:/,
  );
  assert.ok(gitPreparationCount >= 2);
  assert.ok(sharedSdkPreparationCount >= 2);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /libgtk-3-dev/);
  assert.match(workflow, /libpipewire-0\.3-dev/);
  assert.match(workflow, /pnpm run test/);
  assert.match(workflow, /pnpm run typecheck:packages/);
  assert.match(workflow, /pnpm run verify:packages/);
  assert.match(workflow, /node scripts\/run-tauri-cli\.mjs build --vite-mode/);
  assert.match(workflow, /node scripts\/release\/package-release-assets\.mjs desktop/);
  assert.match(workflow, /softprops\/action-gh-release@/);
});
