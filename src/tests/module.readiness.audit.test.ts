import { describe, expect, it } from "vitest";
import { createModuleReadinessEntry, summarizeModuleReadiness } from "../../scripts/module-readiness-lib.mjs";

describe("module readiness audit", () => {
  it("classifies a routed and tested module as ready", () => {
    const entry = createModuleReadinessEntry({
      name: "@sdkwork/openchat-pc-creation",
      hasReadme: true,
      hasIndex: true,
      hasPages: true,
      hasServices: true,
      hasRoutes: true,
      hasTests: true,
      hasWorkspaceModel: true,
    });

    expect(entry.slug).toBe("creation");
    expect(entry.status).toBe("ready");
    expect(entry.score).toBe(7);
  });

  it("flags modules without route or test coverage as implementation-gap", () => {
    const entry = createModuleReadinessEntry({
      name: "@sdkwork/openchat-pc-search",
      hasReadme: true,
      hasIndex: true,
      hasPages: true,
      hasServices: true,
      hasRoutes: false,
      hasTests: false,
      hasWorkspaceModel: false,
    });

    expect(entry.status).toBe("implementation-gap");
    expect(entry.score).toBe(4);
  });

  it("summarizes counts by readiness state", () => {
    const summary = summarizeModuleReadiness([
      createModuleReadinessEntry({
        name: "@sdkwork/openchat-pc-creation",
        hasReadme: true,
        hasIndex: true,
        hasPages: true,
        hasServices: true,
        hasRoutes: true,
        hasTests: true,
        hasWorkspaceModel: true,
      }),
      createModuleReadinessEntry({
        name: "@sdkwork/openchat-pc-agents",
        hasReadme: true,
        hasIndex: true,
        hasPages: true,
        hasServices: false,
        hasRoutes: true,
        hasTests: false,
        hasWorkspaceModel: false,
      }),
    ]);

    expect(summary.total).toBe(2);
    expect(summary.ready).toBe(1);
    expect(summary["implementation-gap"]).toBe(1);
  });
});
