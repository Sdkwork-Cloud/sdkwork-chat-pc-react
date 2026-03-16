import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  collectModuleReadiness,
  renderModuleReadinessReport,
  summarizeModuleReadiness,
} from "./module-readiness-lib.mjs";

const rootDir = process.cwd();
const entries = collectModuleReadiness(rootDir);
const reportPath = path.join(rootDir, "docs", "reports", "module-readiness-report.md");
const report = renderModuleReadinessReport(entries);

fs.writeFileSync(reportPath, report, "utf8");

const summary = summarizeModuleReadiness(entries);
console.log(
  `Module readiness report written to ${path.relative(rootDir, reportPath)} (${summary.ready} ready / ${summary["implementation-gap"]} implementation-gap / ${summary["scaffold-only"]} scaffold-only).`,
);
