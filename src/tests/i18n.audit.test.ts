import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";
import * as ts from "typescript";

const ROOT = process.cwd();
const SCAN_ROOTS = ["packages", "src", "tests", "src-tauri"] as const;
const EXCLUDED_DIRECTORIES = new Set(["node_modules", "dist", "coverage", "target", ".git"]);
const DORMANT_COMMONS_AUDIT_EXCLUSIONS = new Set([
  "packages/sdkwork-openchat-pc-commons/src/components/ui/Input/index.tsx",
  "packages/sdkwork-openchat-pc-commons/src/components/ui/LazyImage/index.tsx",
  "packages/sdkwork-openchat-pc-commons/src/components/ui/MarkdownRenderer/index.tsx",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useMarkdownWorker.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/usePerformanceMonitor.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useServiceWorker.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useSmartPreload.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useTimeSlicing.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useVirtualListPool.ts",
  "packages/sdkwork-openchat-pc-commons/src/hooks/useWasm.ts",
  "packages/sdkwork-openchat-pc-commons/src/services/file.service.ts",
  "packages/sdkwork-openchat-pc-commons/src/services/memory.service.ts",
  "packages/sdkwork-openchat-pc-commons/src/services/websocket.client.ts",
  "packages/sdkwork-openchat-pc-commons/src/utils/arcCache.ts",
  "packages/sdkwork-openchat-pc-commons/src/utils/bloomFilter.ts",
  "packages/sdkwork-openchat-pc-commons/src/utils/consistentHash.ts",
  "packages/sdkwork-openchat-pc-commons/src/utils/layeredCache.ts",
  "packages/sdkwork-openchat-pc-commons/src/utils/lruCache.ts",
]);
const ALLOWED_CJK_FILES = new Set([
  "packages/sdkwork-openchat-pc-i18n/src/resources/zh-CN.ts",
  "src-tauri/src/main.rs",
]);
const EN_US_RESOURCE_PATH = "packages/sdkwork-openchat-pc-i18n/src/resources/en-US.ts";
const ZH_CN_RESOURCE_PATH = "packages/sdkwork-openchat-pc-i18n/src/resources/zh-CN.ts";
const TARGETED_RUNTIME_LITERAL_AUDIT: Array<{ file: string; patterns: Array<{ label: string; regex: RegExp }> }> = [
  {
    file: "packages/sdkwork-openchat-pc-social/src/pages/MomentsPage.tsx",
    patterns: [
      { label: "Create Moment", regex: />\s*Create Moment\s*</ },
      { label: "Share an update with your team", regex: /placeholder="Share an update with your team"/ },
      { label: "Loading moments...", regex: />\s*Loading moments\.\.\.\s*</ },
      { label: "No moments found.", regex: />\s*No moments found\.\s*</ },
      { label: "Activity Insight", regex: />\s*Activity Insight\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-im/src/components/CreateGroupModal.tsx",
    patterns: [
      { label: "Create Group Chat", regex: /title="Create Group Chat"/ },
      { label: "Create Group", regex: /confirmText="Create Group"/ },
      { label: "Group name", regex: />\s*Group name\s*</ },
      { label: "Search by id or name", regex: /placeholder="Search by id or name"/ },
      { label: "Selected list", regex: />\s*Selected list\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-im/src/components/AddFriendModal.tsx",
    patterns: [
      { label: "Add Contact", regex: /title="Add Contact"/ },
      { label: "Send Request", regex: /confirmText="Send Request"/ },
      { label: "Type a keyword", regex: /placeholder="Type a keyword"/ },
      { label: "Searching...", regex: />\s*Searching\.\.\.\s*</ },
      { label: "Request message", regex: />\s*Request message\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-contacts/src/components/GroupDetail.tsx",
    patterns: [
      { label: "Group Notices", regex: />\s*Group Notices\s*</ },
      { label: "Publish a notice to all members...", regex: /placeholder="Publish a notice to all members\.\.\."/ },
      { label: "Leave Group", regex: />\s*Leave Group\s*</ },
      { label: "Leaving...", regex: />\s*Leaving\.\.\.\s*</ },
      { label: "Muted until ", regex: /return `Muted until \$\{/ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-search/src/components/SearchPalette.tsx",
    patterns: [
      {
        label: "Search agents, contacts, files, commands...",
        regex: /placeholder="Search agents, contacts, files, commands\.\.\."/,
      },
      { label: "Loading search context...", regex: />\s*Loading search context\.\.\.\s*</ },
      { label: "Recent searches", regex: />\s*Recent searches\s*</ },
      { label: "No recent search history.", regex: />\s*No recent search history\.\s*</ },
      { label: "Related suggestions", regex: />\s*Related suggestions\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-im/src/components/ConversationItem.tsx",
    patterns: [{ label: "Typing...", regex: />\s*Typing\.\.\.\s*</ }],
  },
  {
    file: "packages/sdkwork-openchat-pc-skill/src/components/SkillCard.tsx",
    patterns: [
      { label: "Needs config", regex: />\s*Needs config\s*</ },
      { label: "Enabled", regex: />\s*Enabled\s*</ },
      { label: "Enable", regex: />\s*Enable\s*</ },
      { label: "uses", regex: /toLocaleString\(\)\}\s*uses/ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-settings/src/pages/SettingsPage.tsx",
    patterns: [
      { label: "Everyone", regex: />\s*Everyone\s*</ },
      { label: "Contacts only", regex: />\s*Contacts only\s*</ },
      { label: "Nobody", regex: />\s*Nobody\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-contacts/src/pages/ContactsPage.tsx",
    patterns: [
      { label: "window.prompt Group name", regex: /window\.prompt\("Group name"/ },
      { label: "fallback friend signature", regex: /signature:\s*"Stay focused and keep shipping\."/ },
      { label: "fallback group name", regex: /name:\s*"OpenChat Product"/ },
      { label: "fallback request message", regex: /message:\s*"Hi, let's connect for product sync\."/ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-communication/src/pages/CallsPage.tsx",
    patterns: [
      { label: "raw queue target in list", regex: />\s*\{item\.target\}\s*</ },
      { label: "raw selected target in detail", regex: />\s*\{selected\.target\}\s*</ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-order-center/src/pages/OrderCenterPage.tsx",
    patterns: [
      { label: "hardcoded order customer", regex: /customer:\s*"ACME Inc\."/ },
      { label: "raw customer in list", regex: />\s*\{item\.customer\}\s*</ },
      { label: "raw selected customer", regex: /\{tr\("Customer"\)\}:\s*\{selected\.customer\}/ },
    ],
  },
  {
    file: "packages/sdkwork-openchat-pc-device/src/pages/DeviceListPage.tsx",
    patterns: [{ label: "Chinese route separator literal", regex: /\}\s*\u8def\s*\{/ }],
  },
  {
    file: "packages/sdkwork-openchat-pc-commerce/src/pages/MallPage.tsx",
    patterns: [{ label: "module fallback product literals", regex: /const fallbackProducts:\s*Product\[\]\s*=/ }],
  },
  {
    file: "packages/sdkwork-openchat-pc-im/src/pages/ChatPage.tsx",
    patterns: [
      { label: "module fallback conversations", regex: /const fallbackConversations:\s*Conversation\[\]\s*=/ },
      { label: "module fallback messages", regex: /const fallbackMessages:\s*Record<string,\s*Message\[\]>\s*=/ },
    ],
  },
];

const TRANSLATION_KEY_SCAN_DIRECTORIES = [
  "src/app",
  "src/layouts",
  "src/router",
] as const;

function loadZhCnResource(): Record<string, string> {
  const content = readFileSync(join(ROOT, ZH_CN_RESOURCE_PATH), "utf8");
  const match = content.match(/const zhCN: Record<string, string> = (\{[\s\S]*\});\s*export default zhCN;?\s*$/);
  if (!match) {
    throw new Error("Failed to parse zh-CN resource file.");
  }

  return Function(`return (${match[1]});`)() as Record<string, string>;
}

function loadResourceMap(filePath: string): Record<string, string> {
  const content = readFileSync(join(ROOT, filePath), "utf8");
  const match = content.match(/const \w+: Record<string, string> = (\{[\s\S]*\});\s*export default \w+;?\s*$/);
  if (!match) {
    throw new Error(`Failed to parse i18n resource file: ${filePath}`);
  }

  return Function(`return (${match[1]});`)() as Record<string, string>;
}

function collectTranslationKeyFiles(directory: string): string[] {
  return collectFiles(directory).filter((absolutePath) => /\.(ts|tsx)$/.test(absolutePath));
}

function collectTranslationKeysFromFile(absolutePath: string): string[] {
  const source = readFileSync(absolutePath, "utf8");
  const isTsx = absolutePath.endsWith(".tsx");
  const sourceFile = ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const keys = new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const isTranslateCall =
        (ts.isIdentifier(expression) && (expression.text === "tr" || expression.text === "translate"))
        || (ts.isPropertyAccessExpression(expression) && expression.name.text === "tr");

      if (isTranslateCall && node.arguments.length > 0) {
        const firstArgument = node.arguments[0];
        if (ts.isStringLiteral(firstArgument) || ts.isNoSubstitutionTemplateLiteral(firstArgument)) {
          keys.add(firstArgument.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...keys];
}

function collectFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRECTORIES.has(entry)) {
      continue;
    }

    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      files.push(...collectFiles(absolutePath));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function getTrackedSourceFiles(): string[] {
  return SCAN_ROOTS.flatMap((root) => collectFiles(join(ROOT, root))).filter((absolutePath) => {
    const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
    return (
      !filePath.startsWith("src-tauri/icons/")
      && !DORMANT_COMMONS_AUDIT_EXCLUSIONS.has(filePath)
    );
  });
}

function getPackageUiFiles(): string[] {
  return collectFiles(join(ROOT, "packages")).filter((absolutePath) =>
    /[\\/]src[\\/](components|pages)[\\/].*\.(ts|tsx)$/.test(absolutePath)
    && !DORMANT_COMMONS_AUDIT_EXCLUSIONS.has(relative(ROOT, absolutePath).replaceAll("\\", "/"))
    && !absolutePath.endsWith(".test.tsx"),
  );
}

function getAppShellTranslationFiles(): string[] {
  return [
    join(ROOT, "src/main.tsx"),
    ...TRANSLATION_KEY_SCAN_DIRECTORIES.flatMap((directory) =>
      collectTranslationKeyFiles(join(ROOT, directory)),
    ),
  ];
}

function collectReferencedTranslationKeys(fileContent: string): string[] {
  const keys = new Set<string>();
  const translationCallPatterns = [
    /\btr\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g,
    /\btranslate\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g,
  ];
  const namespacedKeyPattern = /(["'`])((?:settings|[A-Z][A-Za-z0-9_-]*)(?:\.[A-Za-z0-9_-]+)+)\1/g;

  for (const pattern of translationCallPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fileContent))) {
      const key = match[2];
      if (!key.includes("${")) {
        keys.add(key);
      }
    }
  }

  let match: RegExpExecArray | null;
  while ((match = namespacedKeyPattern.exec(fileContent))) {
    keys.add(match[2]);
  }

  return [...keys];
}

function collectVisibleLiteralFilesWithoutI18n(): string[] {
  const visibleAttrPattern =
    /(title|placeholder|label|aria-label|confirmText|cancelText|emptyText|description|helperText|tooltip|alt)=\s*(["'`])([^{}][\s\S]*?)\2/g;
  const textNodePattern = />\s*([A-Za-z][A-Za-z0-9 ,.!?:;'/()#+\-%&]+?)\s*</g;

  return getPackageUiFiles()
    .filter((absolutePath) => !absolutePath.endsWith(".test.tsx"))
    .map((absolutePath) => {
      const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
      const content = readFileSync(absolutePath, "utf8");
      const hasI18n = /useAppTranslation|\btranslate\(|\btr\(/.test(content);

      if (hasI18n) {
        return null;
      }

      const visibleHits: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = visibleAttrPattern.exec(content))) {
        const value = match[3].trim();
        if (/[A-Za-z]/.test(value)) {
          visibleHits.push(value);
        }
      }

      while ((match = textNodePattern.exec(content))) {
        const value = match[1].trim();
        if (value.length > 1 && !/^class(Name)?$/i.test(value)) {
          visibleHits.push(value);
        }
      }

      return visibleHits.length > 0 ? filePath : null;
    })
    .filter((value): value is string => Boolean(value));
}

describe("i18n source audit", () => {
  it("contains no Chinese characters outside approved localized resource files", () => {
    const offenders = getTrackedSourceFiles()
      .map((absolutePath) => {
        const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
        if (ALLOWED_CJK_FILES.has(filePath)) {
          return null;
        }

        const content = readFileSync(absolutePath, "utf8");
        return /[\u4e00-\u9fff]/.test(content) ? filePath : null;
      })
      .filter((value): value is string => Boolean(value));

    expect(offenders).toEqual([]);
  });

  it("does not hardcode zh-CN into date or number formatting calls", () => {
    const localeFormattingPattern =
      /toLocale(?:DateString|TimeString|String)\(\s*["']zh-CN["']|Intl\.(?:DateTimeFormat|NumberFormat)\(\s*["']zh-CN["']/;

    const offenders = getTrackedSourceFiles()
      .map((absolutePath) => {
        const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
        const content = readFileSync(absolutePath, "utf8");
        return localeFormattingPattern.test(content) ? filePath : null;
      })
      .filter((value): value is string => Boolean(value));

    expect(offenders).toEqual([]);
  });

  it("keeps zh-CN resources ASCII-safe and free of placeholder corruption", () => {
    const content = readFileSync(join(ROOT, ZH_CN_RESOURCE_PATH), "utf8");

    expect(/[\u0080-\uffff]/.test(content)).toBe(false);
    expect(/\?{3,}|\uFFFD/.test(content)).toBe(false);
  });

  it("keeps shared package component/page translation keys present in both locale resources", () => {
    const zhCnKeys = new Set(Object.keys(loadResourceMap(ZH_CN_RESOURCE_PATH)));
    const enUsKeys = new Set(Object.keys(loadResourceMap(EN_US_RESOURCE_PATH)));

    const offenders = getPackageUiFiles().flatMap((absolutePath) => {
      const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
      const content = readFileSync(absolutePath, "utf8");

      return collectReferencedTranslationKeys(content).flatMap((key) => {
        const missingLocales = [
          ...(zhCnKeys.has(key) ? [] : ["zh-CN"]),
          ...(enUsKeys.has(key) ? [] : ["en-US"]),
        ];

        return missingLocales.length > 0
          ? [`${filePath}: ${key} -> ${missingLocales.join(", ")}`]
          : [];
      });
    });

    expect(offenders).toEqual([]);
  });

  it("keeps zh-CN resources complete for translation keys used by package components and pages", () => {
    const zhCnKeys = new Set(Object.keys(loadZhCnResource()));

    const offenders = getPackageUiFiles().flatMap((absolutePath) => {
      const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
      return collectTranslationKeysFromFile(absolutePath)
        .filter((key) => !zhCnKeys.has(key))
        .map((key) => `${filePath}: ${key}`);
    });

    expect(offenders).toEqual([]);
  });

  it("requires obvious package component/page literals to opt into i18n helpers", () => {
    expect(collectVisibleLiteralFilesWithoutI18n()).toEqual([]);
  });

  it("removes known runtime literals from the remaining high-priority package hotspots", () => {
    const offenders = TARGETED_RUNTIME_LITERAL_AUDIT.flatMap(({ file, patterns }) => {
      const content = readFileSync(join(ROOT, file), "utf8");
      return patterns
        .filter(({ regex }) => regex.test(content))
        .map(({ label }) => `${file}: ${label}`);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps zh-CN resources complete for translation keys used by the app shell", () => {
    const zhCnKeys = new Set(Object.keys(loadZhCnResource()));
    const sourceFiles = getAppShellTranslationFiles();

    const offenders = sourceFiles.flatMap((absolutePath) => {
      const filePath = relative(ROOT, absolutePath).replaceAll("\\", "/");
      return collectTranslationKeysFromFile(absolutePath)
        .filter((key) => !zhCnKeys.has(key))
        .map((key) => `${filePath}: ${key}`);
    });

    expect(offenders).toEqual([]);
  });
});
