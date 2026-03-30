import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('repository exposes mainline CI verification for desktop release prerequisites', () => {
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  assert.equal(existsSync(workflowPath), true, 'missing .github/workflows/ci.yml');

  const workflow = read('.github/workflows/ci.yml');
  const gitPreparationCount =
    workflow.match(/node scripts\/prepare-shared-sdk-git-sources\.mjs/g)?.length ?? 0;
  const sharedSdkPreparationCount =
    workflow.match(/pnpm prepare:shared-sdk/g)?.length ?? 0;

  assert.match(workflow, /push:\s*[\s\S]*branches:\s*[\s\S]*-\s*main/);
  assert.match(workflow, /pull_request:\s*[\s\S]*branches:\s*[\s\S]*-\s*main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /ubuntu-latest/);
  assert.match(workflow, /windows-2022/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_MODE:\s*git/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_APP_GIT_REF:\s*[0-9a-f]{40}/);
  assert.match(workflow, /SDKWORK_SHARED_SDK_COMMON_GIT_REF:\s*[0-9a-f]{40}/);
  assert.match(workflow, /SDKWORK_IM_SDK_GIT_REF:\s*[0-9a-f]{40}/);
  assert.match(workflow, /SDKWORK_IM_SDK_REPO_URL:\s*https:\/\/github\.com\/Sdkwork-Cloud\/sdkwork-im-sdk\.git/);
  assert.doesNotMatch(
    workflow,
    /uses:\s*pnpm\/action-setup@v4\s*\r?\n\s+with:\s*\r?\n\s+version:/,
  );
  assert.ok(gitPreparationCount >= 2);
  assert.ok(sharedSdkPreparationCount >= 2);
  assert.match(workflow, /pnpm run check:automation/);
  assert.match(workflow, /pnpm run test/);
  assert.match(workflow, /pnpm run typecheck:packages/);
  assert.match(workflow, /pnpm run verify:packages/);
  assert.match(workflow, /cargo check --manifest-path src-tauri\/Cargo\.toml/);
});
