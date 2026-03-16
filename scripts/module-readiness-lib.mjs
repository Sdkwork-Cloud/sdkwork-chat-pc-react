import fs from "node:fs";
import path from "node:path";

const workspacePrefix = "@sdkwork/openchat-pc-";

export function createModuleReadinessEntry(input) {
  const slug = input.name.startsWith(workspacePrefix)
    ? input.name.slice(workspacePrefix.length)
    : input.name;
  const score = [
    input.hasReadme,
    input.hasIndex,
    input.hasPages,
    input.hasServices,
    input.hasRoutes,
    input.hasTests,
    input.hasWorkspaceModel,
  ].filter(Boolean).length;

  let status = "scaffold-only";
  if (input.hasPages && input.hasRoutes && input.hasTests && input.hasWorkspaceModel) {
    status = "ready";
  } else if (input.hasPages || input.hasServices || input.hasRoutes || input.hasTests) {
    status = "implementation-gap";
  }

  return {
    ...input,
    slug,
    score,
    status,
  };
}

export function summarizeModuleReadiness(entries) {
  return entries.reduce(
    (summary, entry) => {
      summary.total += 1;
      summary[entry.status] += 1;
      return summary;
    },
    {
      total: 0,
      ready: 0,
      "implementation-gap": 0,
      "scaffold-only": 0,
    },
  );
}

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function parseWorkspacePackageRefs(source) {
  return [...source.matchAll(/@sdkwork\/openchat-pc-([a-z-]+)/g)].map((match) => match[1]);
}

function createEvidenceMatcher(files) {
  const normalizedFiles = files.map((filePath) => filePath.replace(/\\/g, "/").toLowerCase());
  return (aliases) =>
    normalizedFiles.some((filePath) =>
      aliases.some((alias) => {
        const needle = alias.toLowerCase();
        return filePath.includes(`/${needle}.`) || filePath.includes(`/${needle}/`) || filePath.includes(needle);
      }),
    );
}

export function collectModuleReadiness(rootDir) {
  const packagesDir = path.join(rootDir, "packages");
  const routerSource = fs.readFileSync(path.join(rootDir, "src", "router", "index.tsx"), "utf8");
  const routeAliases = new Set(parseWorkspacePackageRefs(routerSource));
  const testFiles = [
    ...collectFiles(path.join(rootDir, "src", "tests")),
    ...collectFiles(path.join(rootDir, "tests")),
  ];
  const testMatcher = createEvidenceMatcher(testFiles);

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("sdkwork-openchat-pc-"))
    .map((entry) => {
      const packageDir = path.join(packagesDir, entry.name);
      const packageJsonPath = path.join(packageDir, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8").replace(/^\uFEFF/, ""));
      const slug = entry.name.replace("sdkwork-openchat-pc-", "");
      const indexPath = path.join(packageDir, "src", "index.ts");
      const indexSource = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
      const aliasSet = new Set([slug, ...parseWorkspacePackageRefs(indexSource)]);
      const aliases = [...aliasSet];
      const packageFiles = collectFiles(path.join(packageDir, "src")).map((filePath) =>
        filePath.replace(/\\/g, "/"),
      );

      const hasPages = packageFiles.some((filePath) => filePath.includes("/pages/"));
      const hasServices = packageFiles.some((filePath) => filePath.includes("/services/"));
      const hasWorkspaceModel = packageFiles.some((filePath) => filePath.includes(".workspace.model."));
      const hasRoutes = aliases.some((alias) => routeAliases.has(alias));
      const hasTests = testMatcher(aliases);

      return createModuleReadinessEntry({
        name: packageJson.name,
        hasReadme: fs.existsSync(path.join(packageDir, "README.md")),
        hasIndex: fs.existsSync(indexPath),
        hasPages,
        hasServices,
        hasRoutes,
        hasTests,
        hasWorkspaceModel,
        aliases,
      });
    })
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug));
}

export function renderModuleReadinessReport(entries) {
  const summary = summarizeModuleReadiness(entries);
  const lines = [
    "# Module Readiness Report",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total modules: ${summary.total}`,
    `- Ready: ${summary.ready}`,
    `- Implementation gap: ${summary["implementation-gap"]}`,
    `- Scaffold only: ${summary["scaffold-only"]}`,
    "",
    "## Matrix",
    "",
    "| Module | Score | Routes | Tests | Workspace Model | Pages | Services | Status | Notes |",
    "|---|---:|---:|---:|---:|---:|---:|---|---|",
  ];

  for (const entry of entries) {
    const notes = [];
    if (!entry.hasRoutes && entry.hasPages) notes.push("not routed");
    if (!entry.hasTests && (entry.hasPages || entry.hasServices)) notes.push("no focused tests");
    if (!entry.hasWorkspaceModel && entry.hasPages) notes.push("no workspace model");
    if (entry.aliases.length > 1) notes.push(`aliases: ${entry.aliases.join(", ")}`);

    lines.push(
      `| ${entry.slug} | ${entry.score} | ${entry.hasRoutes ? "Y" : "N"} | ${entry.hasTests ? "Y" : "N"} | ${entry.hasWorkspaceModel ? "Y" : "N"} | ${entry.hasPages ? "Y" : "N"} | ${entry.hasServices ? "Y" : "N"} | ${entry.status} | ${notes.join("; ") || "-"} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}
