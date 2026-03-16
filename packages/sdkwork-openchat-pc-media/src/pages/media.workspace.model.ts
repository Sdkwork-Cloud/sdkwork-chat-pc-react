export interface MediaChannel {
  id: string;
  name: string;
  type: "audio" | "video" | "podcast";
  nowPlaying: string;
  audience: number;
}

export type MediaTypeFilter = "all" | MediaChannel["type"];

export interface MediaWorkspaceSummary {
  total: number;
  audio: number;
  video: number;
  podcast: number;
  audience: number;
}

export const MEDIA_CHANNELS: MediaChannel[] = [
  { id: "media-1", name: "AI Daily Brief", type: "audio", nowPlaying: "Prompt Ops #42", audience: 1280 },
  { id: "media-2", name: "Creator Stream", type: "video", nowPlaying: "Design to Code Live", audience: 420 },
  { id: "media-3", name: "Engineering Podcast", type: "podcast", nowPlaying: "Runtime Contract Patterns", audience: 760 },
];

export function filterMediaWorkspace(
  channels: readonly MediaChannel[],
  input: { keyword?: string; type?: MediaTypeFilter },
): MediaChannel[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const type = input.type || "all";

  return channels.filter((item) => {
    if (type !== "all" && item.type !== type) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return `${item.name} ${item.type} ${item.nowPlaying}`.toLowerCase().includes(keyword);
  });
}

export function buildMediaWorkspaceSummary(channels: readonly MediaChannel[]): MediaWorkspaceSummary {
  return channels.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.type] += 1;
      acc.audience += item.audience;
      return acc;
    },
    { total: 0, audio: 0, video: 0, podcast: 0, audience: 0 },
  );
}
