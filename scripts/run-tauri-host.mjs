import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { resolveSharedSdkMode } from './shared-sdk-mode.mjs';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveViteMode(command, env) {
  const explicitMode = env.SDKWORK_VITE_MODE?.trim();
  if (explicitMode) {
    return explicitMode;
  }

  return command === 'build' ? 'production' : 'development';
}

function resolveScriptName(command, viteMode) {
  if (command === 'dev') {
    if (viteMode === 'test') {
      return 'dev:test';
    }

    if (viteMode === 'production') {
      return 'dev:prod';
    }

    return 'dev';
  }

  if (viteMode === 'development') {
    return 'build:dev';
  }

  if (viteMode === 'test') {
    return 'build:test';
  }

  return 'build:prod';
}

function main() {
  const command = process.argv[2];
  if (command !== 'dev' && command !== 'build') {
    console.error('Usage: node scripts/run-tauri-host.mjs <dev|build>');
    process.exit(1);
  }

  const viteMode = resolveViteMode(command, process.env);
  const env = {
    ...process.env,
    SDKWORK_VITE_MODE: viteMode,
  };

  if (command === 'build' && resolveSharedSdkMode(env) === 'git') {
    run('pnpm', ['run', 'prepare:shared-sdk'], env);
  }

  run('pnpm', ['run', resolveScriptName(command, viteMode)], env);
}

main();
