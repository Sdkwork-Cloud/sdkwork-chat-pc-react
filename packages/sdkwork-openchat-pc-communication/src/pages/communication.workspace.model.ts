export interface CallTicket {
  id: string;
  target: string;
  direction: "inbound" | "outbound";
  status: "ringing" | "connected" | "missed";
  startedAt: string;
  quality: "excellent" | "good" | "unstable";
}

export type CallStatusFilter = "all" | CallTicket["status"];

export interface CallQueueSummary {
  total: number;
  ringing: number;
  connected: number;
  missed: number;
}

export const CALL_QUEUE: CallTicket[] = [
  {
    id: "call-1001",
    target: "Global Sales Team",
    direction: "outbound",
    status: "connected",
    startedAt: "2026-03-08T10:15:00+08:00",
    quality: "excellent",
  },
  {
    id: "call-1002",
    target: "Support Queue #1",
    direction: "inbound",
    status: "ringing",
    startedAt: "2026-03-08T10:28:00+08:00",
    quality: "good",
  },
  {
    id: "call-1003",
    target: "Design Review Channel",
    direction: "outbound",
    status: "missed",
    startedAt: "2026-03-08T09:45:00+08:00",
    quality: "unstable",
  },
];

export function filterCallQueue(calls: readonly CallTicket[], input: { keyword?: string; status?: CallStatusFilter }): CallTicket[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const status = input.status || "all";

  return calls.filter((item) => {
    if (status !== "all" && item.status !== status) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${item.target} ${item.direction} ${item.status}`.toLowerCase().includes(keyword);
  });
}

export function buildCallQueueSummary(calls: readonly CallTicket[]): CallQueueSummary {
  return calls.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] += 1;
      return acc;
    },
    { total: 0, ringing: 0, connected: 0, missed: 0 },
  );
}
