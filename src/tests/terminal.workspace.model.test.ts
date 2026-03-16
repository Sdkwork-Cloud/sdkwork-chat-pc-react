import { describe, expect, it } from "vitest";
import {
  QUICK_COMMANDS,
  appendTerminalHistory,
  appendTerminalLog,
  buildTerminalWorkspaceSummary,
  getTerminalWelcomeLines,
} from "@sdkwork/openchat-pc-terminal";

describe("terminal workspace model", () => {
  it("manages logs, history and session summaries", () => {
    const session = {
      id: "s1",
      name: "terminal-1",
      shell: "bash",
      cwd: "~",
      status: "connected" as const,
      createdAt: 1,
      lastActivityAt: 1,
      isPrimary: true,
    };

    expect(QUICK_COMMANDS).toContain("help");
    expect(appendTerminalLog({}, "s1", "line").s1).toEqual(["line"]);
    expect(appendTerminalHistory({}, "s1", "ls").s1).toEqual(["ls"]);
    expect(getTerminalWelcomeLines(session, true)[1]).toContain("desktop");
    expect(buildTerminalWorkspaceSummary([session])).toMatchObject({ total: 1, connected: 1 });
  });
});
