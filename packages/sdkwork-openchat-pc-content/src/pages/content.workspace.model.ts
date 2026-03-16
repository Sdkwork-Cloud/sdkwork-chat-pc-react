export interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  readCount: number;
  publishedAt: string;
}

export interface ArticleWorkspaceSummary {
  total: number;
  totalReads: number;
  avgReads: number;
  maxRead: number;
}

export const FALLBACK_ARTICLES: ArticleItem[] = [
  {
    id: "art-1",
    title: "Desktop Agent Workflow Tips",
    summary: "Build faster with split-pane review and keyboard-friendly command routing.",
    source: "OpenChat Docs",
    readCount: 1240,
    publishedAt: "2026-03-08T08:00:00+08:00",
  },
  {
    id: "art-2",
    title: "Model Governance Checklist",
    summary: "Standardize policy checks before promoting model presets to production.",
    source: "AI Team",
    readCount: 840,
    publishedAt: "2026-03-07T15:20:00+08:00",
  },
];

export function filterArticleWorkspace(articles: readonly ArticleItem[], keyword?: string): ArticleItem[] {
  const normalizedKeyword = keyword?.trim().toLowerCase() || "";
  if (!normalizedKeyword) {
    return [...articles];
  }
  return articles.filter((item) =>
    `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(normalizedKeyword),
  );
}

export function buildArticleWorkspaceSummary(articles: readonly ArticleItem[]): ArticleWorkspaceSummary {
  const totalReads = articles.reduce((sum, item) => sum + item.readCount, 0);
  const maxRead = articles.reduce((max, item) => (item.readCount > max ? item.readCount : max), 0);

  return {
    total: articles.length,
    totalReads,
    avgReads: articles.length ? Math.round(totalReads / articles.length) : 0,
    maxRead,
  };
}
