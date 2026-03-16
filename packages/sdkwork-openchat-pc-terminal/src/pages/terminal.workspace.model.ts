import type { TerminalSession } from "../entities/terminalSession.entity";

export type SessionLogs = Record<string, string[]>;
export type SessionHistories = Record<string, string[]>;

export const QUICK_COMMANDS = ["help", "pwd", "ls", "date", "whoami", "clear"] as const;

export interface TerminalWorkspaceSummary {
  total: number;
  connected: number;
  connecting: number;
  disconnected: number;
  error: number;
}

export function appendTerminalLog(logs: SessionLogs, sessionId: string, line: string): SessionLogs {
  const current = logs[sessionId] || [];
  return {
    ...logs,
    [sessionId]: [...current, line],
  };
}

export function appendTerminalHistory(
  histories: SessionHistories,
  sessionId: string,
  command: string,
): SessionHistories {
  const current = histories[sessionId] || [];
  if (current[current.length - 1] === command) {
    return histories;
  }
  return {
    ...histories,
    [sessionId]: [...current, command].slice(-100),
  };
}

export function getTerminalWelcomeLines(session: TerminalSession, isDesktop: boolean): string[] {
  return [
    `$ session ${session.name} created (${session.id})`,
    isDesktop ? "$ desktop PTY ready" : "$ web fallback shell ready",
    "$ type 'help' to view available commands",
  ];
}

export function buildTerminalWorkspaceSummary(sessions: readonly TerminalSession[]): TerminalWorkspaceSummary {
  return sessions.reduce(
    (acc, session) => {
      acc.total += 1;
      acc[session.status] += 1;
      return acc;
    },
    { total: 0, connected: 0, connecting: 0, disconnected: 0, error: 0 },
  );
}
