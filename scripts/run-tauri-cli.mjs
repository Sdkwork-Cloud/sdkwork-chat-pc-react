#!/usr/bin/env node

import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

function normalizeViteMode(value, fallback = 'development') {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dev' || normalized === 'development') {
    return 'development';
  }
  if (normalized === 'prod' || normalized === 'production') {
    return 'production';
  }
  if (normalized === 'test') {
    return 'test';
  }
  return fallback;
}

function resolveDefaultMode(command) {
  return command === 'build' ? 'production' : 'development';
}

function parseArgs(argv = []) {
  const args = [];
  let viteMode;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--vite-mode') {
      viteMode = argv[index + 1];
      index += 1;
      continue;
    }
    args.push(token);
  }

  return {
    args,
    viteMode,
  };
}

function resolvePathKey(env) {
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path');
  return pathKey ?? 'PATH';
}

function resolvePathDelimiter(platform) {
  return platform === 'win32' ? ';' : ':';
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function resolvePathApiForPlatform(platform = process.platform) {
  return platform === 'win32' ? path.win32 : path.posix;
}

export function resolveTauriCliCommand({
  cwd = process.cwd(),
  platform = process.platform,
  pathExists = fs.existsSync,
} = {}) {
  const pathApi = resolvePathApiForPlatform(platform);
  const localCliPath = pathApi.resolve(
    cwd,
    'node_modules',
    '.bin',
    platform === 'win32' ? 'tauri.cmd' : 'tauri',
  );

  if (pathExists(localCliPath)) {
    return localCliPath;
  }

  return platform === 'win32' ? 'tauri.cmd' : 'tauri';
}

export function resolveRustToolchainBinCandidates({
  env = process.env,
  platform = process.platform,
} = {}) {
  const pathApi = resolvePathApiForPlatform(platform);
  const candidates = [];
  const cargoHome = String(env.CARGO_HOME ?? '').trim();
  if (cargoHome) {
    candidates.push(pathApi.resolve(cargoHome, 'bin'));
  }

  const homeDir =
    platform === 'win32'
      ? String(env.USERPROFILE ?? env.HOME ?? '').trim()
      : String(env.HOME ?? env.USERPROFILE ?? '').trim();

  if (homeDir) {
    candidates.push(pathApi.resolve(homeDir, '.cargo', 'bin'));
  }

  return uniqueValues(candidates);
}

export function withRustToolchainPath(
  env = process.env,
  {
    platform = process.platform,
    pathExists = fs.existsSync,
  } = {},
) {
  const pathKey = resolvePathKey(env);
  const delimiter = resolvePathDelimiter(platform);
  const currentPathEntries = String(env[pathKey] ?? '')
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const currentPathLookup = new Set(
    currentPathEntries.map((entry) => (platform === 'win32' ? entry.toLowerCase() : entry)),
  );

  const rustToolchainEntries = resolveRustToolchainBinCandidates({
    env,
    platform,
  }).filter((candidatePath) => {
    const lookupKey = platform === 'win32' ? candidatePath.toLowerCase() : candidatePath;
    return pathExists(candidatePath) && !currentPathLookup.has(lookupKey);
  });

  return {
    ...env,
    [pathKey]: [...rustToolchainEntries, ...currentPathEntries].join(delimiter),
  };
}

function inspectCommandAvailability(command, env) {
  const result = spawnSync(command, ['--version'], {
    env,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });

  if (result.error) {
    return {
      available: false,
      command,
      reason: result.error.code === 'ENOENT' ? 'not-found' : 'spawn-error',
      error: result.error.message,
    };
  }

  if (result.status !== 0) {
    return {
      available: false,
      command,
      reason: 'non-zero-exit',
      error: (result.stderr || result.stdout || '').trim(),
    };
  }

  return {
    available: true,
    command,
  };
}

function formatInspectionFailure(inspection) {
  if (inspection.reason === 'not-found') {
    return `command was not found in PATH${inspection.error ? ` (${inspection.error})` : ''}`;
  }

  if (inspection.reason === 'non-zero-exit') {
    return inspection.error || `${inspection.command} --version exited with a non-zero status`;
  }

  return inspection.error || 'command inspection failed for an unknown reason';
}

function buildMissingRustToolchainMessage(inspections, platform = process.platform) {
  const missingCommands = inspections.map((inspection) => inspection.command).join(', ');
  const detailLines = inspections.map((inspection) => {
    return `- ${inspection.command}: ${formatInspectionFailure(inspection)}`;
  });

  return [
    'Rust/Cargo toolchain is required for OpenChat desktop development and release builds.',
    `Missing command(s): ${missingCommands}`,
    '',
    'Detected issue(s):',
    ...detailLines,
    '',
    'Install Rust via rustup: https://rustup.rs/',
    'If Rust is already installed through rustup, reopen the terminal or add the rustup bin directory to PATH:',
    platform === 'win32'
      ? '- %USERPROFILE%\\.cargo\\bin'
      : '- $HOME/.cargo/bin',
    'Then verify:',
    '- cargo --version',
    '- rustc --version',
  ].join('\n');
}

export function ensureTauriRustToolchainEnv(
  env = process.env,
  {
    platform = process.platform,
    pathExists = fs.existsSync,
    inspectCommand = inspectCommandAvailability,
  } = {},
) {
  const resolvedEnv = withRustToolchainPath(env, {
    platform,
    pathExists,
  });
  const failedInspections = ['cargo', 'rustc']
    .map((command) => inspectCommand(command, resolvedEnv))
    .filter((inspection) => inspection.available === false);

  if (failedInspections.length > 0) {
    throw new Error(buildMissingRustToolchainMessage(failedInspections, platform));
  }

  return resolvedEnv;
}

export function createTauriCliPlan({
  argv = [],
  env = process.env,
  platform = process.platform,
  cwd = process.cwd(),
  pathExists = fs.existsSync,
  inspectCommand = inspectCommandAvailability,
} = {}) {
  const { args, viteMode } = parseArgs(Array.isArray(argv) ? argv : []);
  if (args.length === 0) {
    throw new Error(
      'Usage: node scripts/run-tauri-cli.mjs <dev|build> [--vite-mode <mode>] [--target <triple>] [extra tauri args]',
    );
  }

  const tauriCommand = String(args[0]).trim();
  if (tauriCommand !== 'dev' && tauriCommand !== 'build') {
    throw new Error(
      'Usage: node scripts/run-tauri-cli.mjs <dev|build> [--vite-mode <mode>] [--target <triple>] [extra tauri args]',
    );
  }

  const resolvedMode = normalizeViteMode(
    viteMode ?? env.SDKWORK_VITE_MODE,
    resolveDefaultMode(tauriCommand),
  );
  const planEnv = ensureTauriRustToolchainEnv(
    {
      ...env,
      SDKWORK_VITE_MODE: resolvedMode,
    },
    {
      platform,
      pathExists,
      inspectCommand,
    },
  );

  return {
    command: resolveTauriCliCommand({
      cwd,
      platform,
      pathExists,
    }),
    args,
    cwd,
    env: planEnv,
    shell: platform === 'win32',
  };
}

function runCli() {
  const plan = createTauriCliPlan({
    argv: process.argv.slice(2),
  });
  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: 'inherit',
    shell: plan.shell,
  });

  child.on('error', (error) => {
    console.error(`[run-tauri-cli] ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[run-tauri-cli] process exited with signal ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
