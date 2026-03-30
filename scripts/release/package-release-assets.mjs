import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { normalizePlatformId } from './desktop-targets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const tauriRoot = path.resolve(workspaceRoot, 'src-tauri');

function readTauriConfig(tauriConfigPath = path.join(tauriRoot, 'tauri.conf.json')) {
  return JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
}

function copyFileToOutput(sourcePath, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const destinationPath = path.join(outputDir, path.basename(sourcePath));
  fs.copyFileSync(sourcePath, destinationPath);
  return destinationPath;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function archiveMacosAppBundle(sourcePath, outputDir, archiveBaseName) {
  const archivePath = path.join(outputDir, `${archiveBaseName}.zip`);
  run('ditto', ['-c', '-k', '--keepParent', sourcePath, archivePath]);
  return archivePath;
}

export function shouldIncludeDesktopBundleFile(platform, relativePath, absolutePath) {
  const normalizedPath = relativePath.replaceAll('\\', '/').toLowerCase();
  const lowerAbsolutePath = absolutePath.toLowerCase();

  if (platform === 'windows') {
    return lowerAbsolutePath.endsWith('.msi') || lowerAbsolutePath.endsWith('.exe');
  }

  if (platform === 'linux') {
    return (
      lowerAbsolutePath.endsWith('.appimage') ||
      lowerAbsolutePath.endsWith('.deb') ||
      lowerAbsolutePath.endsWith('.rpm')
    );
  }

  if (platform === 'macos') {
    return normalizedPath.endsWith('.app') || lowerAbsolutePath.endsWith('.dmg');
  }

  return false;
}

export function buildDesktopBundleRootCandidates({ targetTriple, targetDir = path.join(tauriRoot, 'target') }) {
  return [
    path.join(targetDir, targetTriple, 'release', 'bundle'),
    path.join(targetDir, 'release', 'bundle'),
  ];
}

export function resolveExistingDesktopBundleRoot({ targetTriple, targetDir } = {}) {
  for (const candidate of buildDesktopBundleRootCandidates({ targetTriple, targetDir })) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find Tauri bundle output for ${targetTriple}.`);
}

function collectEntries(rootDir, currentDir = rootDir, entries = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      entries.push({ absolutePath, relativePath, directory: true });
      collectEntries(rootDir, absolutePath, entries);
      continue;
    }

    entries.push({ absolutePath, relativePath, directory: false });
  }

  return entries;
}

function resolveBundleKind(entry) {
  if (entry.directory && entry.absolutePath.toLowerCase().endsWith('.app')) {
    return 'app';
  }

  return path.extname(entry.absolutePath).toLowerCase();
}

function scoreBundleCandidate(entry, { productName, productVersion }) {
  const normalizedBaseName = path.basename(entry.absolutePath).toLowerCase();
  const normalizedProductName = productName.toLowerCase();
  const normalizedProductVersion = productVersion.toLowerCase();

  if (normalizedBaseName.startsWith(`${normalizedProductName}_${normalizedProductVersion}_`)) {
    return 3;
  }

  if (normalizedBaseName.startsWith(`${normalizedProductName}_`)) {
    return 2;
  }

  if (normalizedBaseName.includes(normalizedProductName)) {
    return 1;
  }

  return 0;
}

function selectDesktopBundleEntries(entries, { platform, productName, productVersion }) {
  const groupedEntries = new Map();

  for (const entry of entries) {
    if (!shouldIncludeDesktopBundleFile(platform, entry.relativePath, entry.absolutePath)) {
      continue;
    }

    const bundleKind = resolveBundleKind(entry);
    const currentEntries = groupedEntries.get(bundleKind) ?? [];
    currentEntries.push(entry);
    groupedEntries.set(bundleKind, currentEntries);
  }

  return Array.from(groupedEntries.values(), (bundleEntries) => {
    return bundleEntries
      .slice()
      .sort((left, right) => {
        const scoreDelta =
          scoreBundleCandidate(right, { productName, productVersion }) -
          scoreBundleCandidate(left, { productName, productVersion });
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        const mtimeDelta =
          fs.statSync(right.absolutePath).mtimeMs - fs.statSync(left.absolutePath).mtimeMs;
        if (mtimeDelta !== 0) {
          return mtimeDelta;
        }

        return left.absolutePath.localeCompare(right.absolutePath);
      })
      .at(0);
  }).filter(Boolean);
}

export function packageDesktopAssets({
  platform,
  arch,
  targetTriple,
  target,
  outputDir,
  targetDir = path.join(tauriRoot, 'target'),
  tauriConfigPath = path.join(tauriRoot, 'tauri.conf.json'),
}) {
  const resolvedTargetTriple = targetTriple ?? target;
  const tauriConfig = readTauriConfig(tauriConfigPath);
  const bundleRoot = resolveExistingDesktopBundleRoot({ targetTriple: resolvedTargetTriple, targetDir });
  const entries = selectDesktopBundleEntries(collectEntries(bundleRoot), {
    platform,
    productName: tauriConfig.package.productName,
    productVersion: tauriConfig.package.version,
  });
  const productName = tauriConfig.package.productName;
  const productVersion = tauriConfig.package.version;

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPaths = [];

  for (const entry of entries) {
    if (entry.directory) {
      if (platform !== 'macos' || !entry.absolutePath.endsWith('.app')) {
        continue;
      }

      outputPaths.push(
        archiveMacosAppBundle(
          entry.absolutePath,
          outputDir,
          `${productName}_${productVersion}_${platform}_${arch}.app`,
        ),
      );
      continue;
    }

    outputPaths.push(copyFileToOutput(entry.absolutePath, outputDir));
  }

  if (outputPaths.length === 0) {
    throw new Error(`No packaged desktop assets were found in ${bundleRoot}.`);
  }

  return outputPaths;
}

function parseArgs(argv) {
  const [kind, ...rest] = argv;
  if (kind !== 'desktop') {
    throw new Error('Usage: node scripts/release/package-release-assets.mjs desktop --platform <id> --arch <id> --target <triple> --output-dir <dir>');
  }

  const options = {
    platform: '',
    arch: '',
    targetTriple: '',
    outputDir: path.join(workspaceRoot, 'artifacts', 'release'),
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const value = rest[index + 1];

    if (arg === '--platform') {
      options.platform = normalizePlatformId(value);
      index += 1;
      continue;
    }

    if (arg === '--arch') {
      options.arch = value;
      index += 1;
      continue;
    }

    if (arg === '--target') {
      options.targetTriple = value;
      index += 1;
      continue;
    }

    if (arg === '--output-dir') {
      options.outputDir = path.resolve(workspaceRoot, value);
      index += 1;
    }
  }

  if (!options.platform || !options.arch || !options.targetTriple) {
    throw new Error('Missing required desktop release packaging options.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  packageDesktopAssets(options);
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
