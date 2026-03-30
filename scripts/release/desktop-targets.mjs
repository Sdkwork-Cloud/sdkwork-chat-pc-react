export function normalizePlatformId(platform) {
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return platform;
  }
}

export function parseDesktopTargetTriple(targetTriple) {
  const normalizedTargetTriple = String(targetTriple ?? '').trim();
  if (!normalizedTargetTriple) {
    throw new Error('Missing desktop target triple.');
  }

  if (normalizedTargetTriple.includes('windows')) {
    return {
      platform: 'windows',
      arch: normalizedTargetTriple.startsWith('aarch64') ? 'arm64' : 'x64',
      targetTriple: normalizedTargetTriple,
    };
  }

  if (normalizedTargetTriple.includes('linux')) {
    return {
      platform: 'linux',
      arch: normalizedTargetTriple.startsWith('aarch64') ? 'arm64' : 'x64',
      targetTriple: normalizedTargetTriple,
    };
  }

  if (normalizedTargetTriple.includes('apple-darwin')) {
    return {
      platform: 'macos',
      arch: normalizedTargetTriple.startsWith('aarch64') ? 'arm64' : 'x64',
      targetTriple: normalizedTargetTriple,
    };
  }

  throw new Error(`Unsupported desktop target triple "${normalizedTargetTriple}".`);
}

export function resolveDesktopReleaseTarget({ env = process.env } = {}) {
  const explicitTarget = env.SDKWORK_DESKTOP_TARGET?.trim();
  if (!explicitTarget) {
    return null;
  }

  return parseDesktopTargetTriple(explicitTarget);
}
