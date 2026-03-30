import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('shared sdk mode helpers exist and default to source mode', async () => {
  const helperPath = path.join(rootDir, 'scripts', 'shared-sdk-mode.mjs');
  assert.equal(existsSync(helperPath), true, 'missing scripts/shared-sdk-mode.mjs');

  const helper = await import(pathToFileURL(helperPath).href);
  assert.equal(helper.SHARED_SDK_MODE_ENV_VAR, 'SDKWORK_SHARED_SDK_MODE');
  assert.equal(helper.resolveSharedSdkMode({}), 'source');
  assert.equal(helper.resolveSharedSdkMode({ SDKWORK_SHARED_SDK_MODE: 'source' }), 'source');
  assert.equal(helper.resolveSharedSdkMode({ SDKWORK_SHARED_SDK_MODE: 'git' }), 'git');
  assert.equal(helper.isSharedSdkSourceMode({}), true);
  assert.equal(helper.isSharedSdkSourceMode({ SDKWORK_SHARED_SDK_MODE: 'git' }), false);
});

test('shared sdk git preparation supports repo-specific pinned refs', async () => {
  const helperPath = path.join(rootDir, 'scripts', 'prepare-shared-sdk-git-sources.mjs');
  assert.equal(existsSync(helperPath), true, 'missing scripts/prepare-shared-sdk-git-sources.mjs');

  const helper = await import(pathToFileURL(helperPath).href);
  assert.equal(helper.SHARED_SDK_APP_GIT_REF_ENV_VAR, 'SDKWORK_SHARED_SDK_APP_GIT_REF');
  assert.equal(helper.SHARED_SDK_COMMON_GIT_REF_ENV_VAR, 'SDKWORK_SHARED_SDK_COMMON_GIT_REF');
  assert.equal(helper.IM_SDK_GIT_REF_ENV_VAR, 'SDKWORK_IM_SDK_GIT_REF');
  assert.equal(helper.IM_SDK_REPO_URL_ENV_VAR, 'SDKWORK_IM_SDK_REPO_URL');
  assert.equal(helper.DEFAULT_IM_SDK_REPO_URL, 'https://github.com/Sdkwork-Cloud/sdkwork-im-sdk.git');
});

test('repository exposes shared sdk preparation helpers and dual-mode Vite resolution', () => {
  const viteConfig = read('vite.config.ts');
  const vitestConfig = read('vitest.config.ts');
  const packageJson = read('package.json');
  const workspaceManifest = read('pnpm-workspace.yaml');
  const npmrcSource = read('.npmrc');

  assert.equal(existsSync(path.join(rootDir, 'scripts', 'prepare-shared-sdk-git-sources.mjs')), true);
  assert.equal(existsSync(path.join(rootDir, 'scripts', 'prepare-shared-sdk-packages.mjs')), true);

  assert.match(viteConfig, /@sdkwork\/app-sdk/);
  assert.match(viteConfig, /sdkwork-app-sdk-typescript/);
  assert.match(viteConfig, /@sdkwork\/sdk-common/);
  assert.match(viteConfig, /sdkwork-sdk-common-typescript/);
  assert.match(viteConfig, /@openchat\/sdkwork-im-sdk/);
  assert.match(viteConfig, /sdkwork-im-sdk-typescript/);
  assert.match(vitestConfig, /@sdkwork\/app-sdk/);
  assert.match(vitestConfig, /sdkwork-app-sdk-typescript/);
  assert.match(vitestConfig, /@sdkwork\/sdk-common/);
  assert.match(vitestConfig, /sdkwork-sdk-common-typescript/);
  assert.match(vitestConfig, /@openchat\/sdkwork-im-sdk/);
  assert.match(vitestConfig, /sdkwork-im-sdk-typescript/);
  assert.doesNotMatch(viteConfig, /isSharedSdkSourceMode\(process\.env\)/);
  assert.doesNotMatch(vitestConfig, /isSharedSdkSourceMode\(process\.env\)/);

  assert.match(packageJson, /"prepare:shared-sdk"\s*:\s*"node scripts\/prepare-shared-sdk-packages\.mjs"/);
  assert.match(packageJson, /"check:shared-sdk"\s*:\s*"node --test scripts\/shared-sdk-contract\.test\.mjs"/);
  assert.match(packageJson, /"check:release-flow"\s*:\s*"node --test scripts\/release-flow-contract\.test\.mjs scripts\/package-release-assets\.test\.mjs"/);
  assert.match(packageJson, /"check:ci-flow"\s*:\s*"node --test scripts\/ci-flow-contract\.test\.mjs"/);
  assert.match(packageJson, /"check:automation"\s*:\s*"pnpm run check:shared-sdk && pnpm run check:release-flow && pnpm run check:ci-flow"/);
  assert.match(packageJson, /"dev:desktop:test"\s*:\s*"node scripts\/run-tauri-cli\.mjs dev --vite-mode test"/);
  assert.match(packageJson, /"build:desktop:dev"\s*:\s*"node scripts\/run-tauri-cli\.mjs build --vite-mode development"/);
  assert.match(packageJson, /"build:desktop:test"\s*:\s*"node scripts\/run-tauri-cli\.mjs build --vite-mode test"/);
  assert.match(packageJson, /"build:desktop:prod"\s*:\s*"node scripts\/run-tauri-cli\.mjs build --vite-mode production"/);

  assert.match(workspaceManifest, /spring-ai-plus-app-api\/sdkwork-sdk-app\/sdkwork-app-sdk-typescript/);
  assert.match(workspaceManifest, /sdk\/sdkwork-sdk-commons\/sdkwork-sdk-common-typescript/);
  assert.match(npmrcSource, /link-workspace-packages\s*=\s*true/);
});

test('kernel IM SDK barrels route through stable package aliases', () => {
  const backendSdkBarrel = read('packages/sdkwork-openchat-pc-kernel/src/im-sdk/backend-sdk.ts');
  const composedSdkBarrel = read('packages/sdkwork-openchat-pc-kernel/src/im-sdk/composed-sdk.ts');
  const wukongimAdapterBarrel = read('packages/sdkwork-openchat-pc-kernel/src/im-sdk/wukongim-adapter.ts');

  assert.match(backendSdkBarrel, /@sdkwork\/im-backend-sdk/);
  assert.match(composedSdkBarrel, /@openchat\/sdkwork-im-sdk/);
  assert.match(wukongimAdapterBarrel, /@openchat\/sdkwork-im-wukongim-adapter/);
  assert.doesNotMatch(backendSdkBarrel, /(?:\.\.\/)+openchat\/sdkwork-im-sdk/);
  assert.doesNotMatch(composedSdkBarrel, /(?:\.\.\/)+openchat\/sdkwork-im-sdk/);
  assert.doesNotMatch(wukongimAdapterBarrel, /(?:\.\.\/)+openchat\/sdkwork-im-sdk/);
});

test('tracked env files align with development, test, and production desktop releases', () => {
  const envExample = read('.env.example');
  const envDevelopment = read('.env.development');
  const envTest = read('.env.test');
  const envProduction = read('.env.production');
  const tauriConfig = read('src-tauri/tauri.conf.json');

  assert.match(envExample, /VITE_APP_ENV="?development"?/);
  assert.match(envDevelopment, /VITE_APP_ENV="?development"?/);
  assert.match(envDevelopment, /VITE_API_BASE_URL="?https:\/\/api-dev\.sdkwork\.com"?/);
  assert.match(envTest, /VITE_APP_ENV="?test"?/);
  assert.match(envTest, /VITE_API_BASE_URL="?https:\/\/api-test\.sdkwork\.com"?/);
  assert.match(envProduction, /VITE_APP_ENV="?production"?/);
  assert.match(envProduction, /VITE_API_BASE_URL="?https:\/\/api\.sdkwork\.com"?/);
  assert.doesNotMatch(envProduction, /api-dev\.sdkwork\.com/);
  assert.doesNotMatch(envProduction, /api-test\.sdkwork\.com/);

  for (const source of [envDevelopment, envTest, envProduction]) {
    assert.match(source, /VITE_PLATFORM="?desktop"?/);
    assert.match(source, /VITE_TIMEOUT="?30000"?/);
    assert.match(source, /VITE_RTC_PROVIDER="?volcengine"?/);
  }

  assert.match(tauriConfig, /beforeBuildCommand":\s*"node scripts\/run-tauri-host\.mjs build"/);
  assert.match(tauriConfig, /beforeDevCommand":\s*"node scripts\/run-tauri-host\.mjs dev"/);
});
