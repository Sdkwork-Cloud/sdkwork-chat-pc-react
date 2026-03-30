import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');

test('desktop release packager ignores stale bundle artifacts from older product names', async () => {
  const packagerPath = path.join(rootDir, 'scripts', 'release', 'package-release-assets.mjs');
  const packager = await import(pathToFileURL(packagerPath).href);

  assert.equal(typeof packager.packageDesktopAssets, 'function');

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'openchat-release-assets-'));
  const targetDir = path.join(tempRoot, 'target');
  const bundleRoot = path.join(targetDir, 'x86_64-pc-windows-msvc', 'release', 'bundle');
  const outputDir = path.join(tempRoot, 'release-assets');
  const tauriConfigPath = path.join(tempRoot, 'tauri.conf.json');

  try {
    mkdirSync(path.join(bundleRoot, 'msi'), { recursive: true });
    mkdirSync(path.join(bundleRoot, 'nsis'), { recursive: true });

    writeFileSync(path.join(bundleRoot, 'msi', 'openchat-react-pc_0.0.1_x64_en-US.msi'), 'stale');
    writeFileSync(path.join(bundleRoot, 'nsis', 'openchat-react-pc_0.0.1_x64-setup.exe'), 'stale');
    writeFileSync(path.join(bundleRoot, 'msi', 'OpenChat_0.0.1_x64_en-US.msi'), 'current');
    writeFileSync(path.join(bundleRoot, 'nsis', 'OpenChat_0.0.1_x64-setup.exe'), 'current');
    writeFileSync(
      tauriConfigPath,
      `${JSON.stringify({ package: { productName: 'OpenChat', version: '0.0.1' } }, null, 2)}\n`,
      'utf8',
    );

    packager.packageDesktopAssets({
      platform: 'windows',
      arch: 'x64',
      targetTriple: 'x86_64-pc-windows-msvc',
      outputDir,
      targetDir,
      tauriConfigPath,
    });

    const outputNames = readdirSync(outputDir).sort();

    assert.equal(existsSync(path.join(outputDir, 'OpenChat_0.0.1_x64_en-US.msi')), true);
    assert.equal(existsSync(path.join(outputDir, 'OpenChat_0.0.1_x64-setup.exe')), true);
    assert.deepEqual(outputNames, ['OpenChat_0.0.1_x64-setup.exe', 'OpenChat_0.0.1_x64_en-US.msi']);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
