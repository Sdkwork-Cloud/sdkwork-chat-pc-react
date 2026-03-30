import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");

const ALLOWED_PACKAGE_NAMES = new Set([
  "sdkwork-openchat-pc-ui",
  "sdkwork-openchat-pc-commons",
]);

const RAW_CONTROL_PATTERN = /<(button|input|select|textarea)\b/g;
const LEGACY_OVERLAY_PATTERN = /className="[^"]*\bfixed inset-0\b[^"]*\bbg-black\//g;
const COMMONS_BRIDGE_FILES = [
  "packages/sdkwork-openchat-pc-commons/src/foundation/ui.tsx",
  "packages/sdkwork-openchat-pc-commons/src/foundation/theme.tsx",
  "packages/sdkwork-openchat-pc-commons/src/foundation/toast.ts",
];

function walkFiles(currentPath: string, output: string[]): void {
  const entries = readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      walkFiles(absolutePath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (absolutePath.endsWith(".tsx")) {
      output.push(absolutePath);
    }
  }
}

function collectBusinessSourceFiles(): string[] {
  const packages = readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((packageName) => !ALLOWED_PACKAGE_NAMES.has(packageName));

  const files: string[] = [];

  for (const packageName of packages) {
    const srcPath = path.join(PACKAGES_ROOT, packageName, "src");
    if (!statExists(srcPath)) {
      continue;
    }
    walkFiles(srcPath, files);
  }

  return files;
}

function statExists(targetPath: string): boolean {
  try {
    return statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function findRawControlViolations(): string[] {
  const sourceFiles = collectBusinessSourceFiles();
  const violations: string[] = [];

  for (const absolutePath of sourceFiles) {
    const source = readFileSync(absolutePath, "utf8");
    const matches = source.match(RAW_CONTROL_PATTERN);
    if (!matches || matches.length === 0) {
      continue;
    }

    const relativePath = path.relative(REPO_ROOT, absolutePath).replace(/\\/g, "/");
    violations.push(`${relativePath} (${matches.length})`);
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function findLegacyOverlayViolations(): string[] {
  const sourceFiles = collectBusinessSourceFiles();
  const violations: string[] = [];

  for (const absolutePath of sourceFiles) {
    const source = readFileSync(absolutePath, "utf8");
    const matches = source.match(LEGACY_OVERLAY_PATTERN);
    if (!matches || matches.length === 0) {
      continue;
    }

    const relativePath = path.relative(REPO_ROOT, absolutePath).replace(/\\/g, "/");
    violations.push(`${relativePath} (${matches.length})`);
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function findCommonsBridgeViolations(): string[] {
  return COMMONS_BRIDGE_FILES.filter((relativePath) => {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return !source.includes('@sdkwork/openchat-pc-ui');
  });
}

function findThemeContractViolations(): string[] {
  const checks: Array<{ path: string; patterns: string[] }> = [
    {
      path: "src/app/providers/ThemeManager.tsx",
      patterns: [
        "--theme-primary-50",
        "--theme-primary-600",
        "--theme-primary-950",
        "--scrollbar-thumb",
        "--scrollbar-track",
      ],
    },
    {
      path: "src/index.css",
      patterns: [
        "--theme-primary-600",
        "--scrollbar-thumb",
        "--scrollbar-track",
      ],
    },
    {
      path: "packages/sdkwork-openchat-pc-commons/src/shell/MainLayout.tsx",
      patterns: [
        "bg-[var(--bg-primary)]",
        "text-[var(--text-primary)]",
        "var(--ai-primary-glow)",
        "bg-[var(--bg-secondary)]",
      ],
    },
  ];

  return checks.flatMap(({ path: relativePath, patterns }) => {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    const missing = patterns.filter((pattern) => !source.includes(pattern));
    return missing.map((pattern) => `${relativePath} -> missing "${pattern}"`);
  });
}

describe("ui foundation audit", () => {
  it("keeps business packages on shared wrapped controls instead of raw html controls", () => {
    const violations = findRawControlViolations();

    expect(
      violations,
      [
        "Raw business controls must be migrated into shared primitives in @sdkwork/openchat-pc-ui.",
        "Allowed raw controls live only inside foundational UI packages.",
        "Current violations:",
        ...violations,
      ].join("\n"),
    ).toEqual([]);
  });

  it("keeps business overlays on shared dialog or popup primitives", () => {
    const violations = findLegacyOverlayViolations();

    expect(
      violations,
      [
        "Business overlays should use shared dialog or popup primitives from @sdkwork/openchat-pc-ui.",
        "Current violations:",
        ...violations,
      ].join("\n"),
    ).toEqual([]);
  });

  it("keeps commons foundation files as thin bridges into the shared ui package", () => {
    const violations = findCommonsBridgeViolations();

    expect(
      violations,
      [
        "Commons foundation files should bridge into @sdkwork/openchat-pc-ui instead of carrying a second foundation.",
        "Current violations:",
        ...violations,
      ].join("\n"),
    ).toEqual([]);
  });

  it("publishes the claw-style theme contract across theme runtime, global css, and shell", () => {
    const violations = findThemeContractViolations();

    expect(
      violations,
      [
        "Theme runtime and shell should expose the claw-studio style contract instead of the legacy AI-only contract.",
        "Current violations:",
        ...violations,
      ].join("\n"),
    ).toEqual([]);
  });
});
