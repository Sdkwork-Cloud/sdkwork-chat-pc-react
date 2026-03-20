import { useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { VideoResultService, VideoService } from "../services";
import type { Video, VideoComment, VideoStats, VideoType } from "../types";
import {
  buildVideoWorkspaceLibrary,
  buildVideoWorkspaceSummary,
  filterVideoWorkspaceFeed,
} from "./video.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

const typeOptions: Array<{ value: "all" | VideoType; label: string }> = [
  { value: "all", label: "All" },
  { value: "neural", label: "Neural" },
  { value: "matrix", label: "Matrix" },
  { value: "aurora", label: "Aurora" },
  { value: "cyber", label: "Cyber" },
  { value: "nature", label: "Nature" },
];

const distributionTypeOptions: Array<{ value: VideoType; label: string }> = typeOptions
  .filter((item): item is { value: VideoType; label: string } => item.value !== "all")
  .map((item) => ({ value: item.value, label: item.label }));

const sortOptions: Array<{ value: "popular" | "new" | "duration"; label: string }> = [
  { value: "popular", label: "Most Popular" },
  { value: "new", label: "Newest" },
  { value: "duration", label: "Longest" },
];

export function ShortVideoPage() {
  const { tr } = useAppTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);

  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | VideoType>("all");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "new" | "duration">("popular");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const [favoriteVideoIds, setFavoriteVideoIds] = useState<string[]>(() => VideoService.getFavoriteVideoIds());
  const [recentVideoIds, setRecentVideoIds] = useState<string[]>(() => VideoService.getRecentVideoIds());

  const loadVideos = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [videosRes, statsRes] = await Promise.all([
        VideoResultService.getVideos(
          {
            type: typeFilter === "all" ? undefined : typeFilter,
            search: keyword.trim() || undefined,
          },
          1,
          30,
        ),
        VideoResultService.getStats(),
      ]);

      const list = videosRes.data?.content || [];
      setVideos(list);
      setStats(statsRes.data || null);

      if (!videosRes.success || !statsRes.success) {
        setErrorText(videosRes.message || statsRes.message || tr("Some video data could not be loaded."));
      }
    } catch (error) {
      setVideos([]);
      setStats(null);
      setSelectedVideoId("");
      setErrorText(error instanceof Error ? error.message : tr("Failed to load videos."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, [typeFilter, keyword]);

  const workspaceVideos = useMemo(
    () =>
      filterVideoWorkspaceFeed(videos, {
        keyword,
        type: typeFilter,
        sortBy,
      }),
    [keyword, sortBy, typeFilter, videos],
  );

  const workspaceSummary = useMemo(() => buildVideoWorkspaceSummary(workspaceVideos), [workspaceVideos]);

  const workspaceLibrary = useMemo(
    () =>
      buildVideoWorkspaceLibrary(videos, {
        favoriteVideoIds,
        recentVideoIds,
      }),
    [favoriteVideoIds, recentVideoIds, videos],
  );

  const favoriteSet = useMemo(() => new Set(favoriteVideoIds), [favoriteVideoIds]);

  useEffect(() => {
    setSelectedVideoId((prev) => {
      if (workspaceVideos.length === 0) {
        return "";
      }
      if (prev && workspaceVideos.some((item) => item.id === prev)) {
        return prev;
      }
      return workspaceVideos[0].id;
    });
  }, [workspaceVideos]);

  const selectedVideo = useMemo(
    () => workspaceVideos.find((item) => item.id === selectedVideoId) || null,
    [workspaceVideos, selectedVideoId],
  );

  useEffect(() => {
    if (!selectedVideoId) {
      setComments([]);
      return;
    }

    let cancelled = false;

    async function loadComments(videoId: string) {
      try {
        await VideoResultService.incrementViews(videoId);
        const commentsRes = await VideoResultService.getComments(videoId);
        if (!cancelled) {
          setComments(commentsRes.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setComments([]);
          setStatusText(error instanceof Error ? error.message : tr("Failed to load comments."));
        }
      }
    }

    void loadComments(selectedVideoId);

    return () => {
      cancelled = true;
    };
  }, [selectedVideoId]);

  const handleOpenVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    setRecentVideoIds(VideoService.markVideoOpened(videoId));
  };

  const handleToggleFavorite = (videoId: string) => {
    VideoService.toggleFavoriteVideo(videoId);
    setFavoriteVideoIds(VideoService.getFavoriteVideoIds());
  };

  const handleToggleLike = async () => {
    if (!selectedVideo) {
      return;
    }

    setStatusText("");
    try {
      const result = await VideoResultService.toggleLike(selectedVideo.id);
      if (!result.success) {
        setStatusText(result.message || tr("Failed to update like state."));
        return;
      }
      await loadVideos();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : tr("Failed to update like state."));
    }
  };

  const handleToggleCollect = async () => {
    if (!selectedVideo) {
      return;
    }

    setStatusText("");
    try {
      const result = await VideoResultService.toggleCollect(selectedVideo.id);
      if (!result.success) {
        setStatusText(result.message || tr("Failed to update collection state."));
        return;
      }
      await loadVideos();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : tr("Failed to update collection state."));
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Short Video")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{tr("Explore AI-generated short videos and interact with creators.")}</p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Current Results")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Views")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatCount(workspaceSummary.views)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Likes")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatCount(workspaceSummary.likes)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Avg Duration")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatDuration(workspaceSummary.avgDuration)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {distributionTypeOptions.map((item) => (
            <span key={item.value} className="rounded-full border border-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary">
              {tr("{{label}}: {{count}}", {
                label: tr(item.label),
                count: workspaceSummary.typeDistribution[item.value],
              })}
            </span>
          ))}
        </div>

        <div className="mt-4 grid h-[calc(100%-140px)] grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <aside className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-4">
            <div className="grid grid-cols-1 gap-2">
              <SharedUi.Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={tr("Search videos")}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <SharedUi.Select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "all" | VideoType)}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {typeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {tr(item.label)}
                  </option>
                ))}
              </SharedUi.Select>
              <SharedUi.Select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "popular" | "new" | "duration")}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {tr(item.label)}
                  </option>
                ))}
              </SharedUi.Select>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-bg-primary p-2 text-text-secondary">
                {tr("Videos")} {stats?.totalVideos ?? 0}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2 text-text-secondary">
                {tr("Views")} {stats ? VideoService.formatCount(stats.totalViews) : 0}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">{tr("Favorites")}</p>
                {workspaceLibrary.favorites.slice(0, 2).map((item) => (
                  <SharedUi.Button
                    key={`favorite-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </SharedUi.Button>
                ))}
                {workspaceLibrary.favorites.length === 0 ? (
                  <p className="text-text-muted">{tr("No favorites yet.")}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">{tr("Recent")}</p>
                {workspaceLibrary.recent.slice(0, 2).map((item) => (
                  <SharedUi.Button
                    key={`recent-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </SharedUi.Button>
                ))}
                {workspaceLibrary.recent.length === 0 ? (
                  <p className="text-text-muted">{tr("No recent history.")}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">{tr("Trending")}</p>
                {workspaceLibrary.trending.slice(0, 2).map((item) => (
                  <SharedUi.Button
                    key={`trending-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </SharedUi.Button>
                ))}
                {workspaceLibrary.trending.length === 0 ? (
                  <p className="text-text-muted">{tr("No trending videos.")}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-auto">
              {isLoading ? (
                <p className="text-sm text-text-secondary">{tr("Loading videos...")}</p>
              ) : workspaceVideos.length === 0 ? (
                <p className="text-sm text-text-secondary">{tr("No videos found.")}</p>
              ) : (
                workspaceVideos.map((video) => (
                  <SharedUi.Button
                    key={video.id}
                    onClick={() => handleOpenVideo(video.id)}
                    className={`w-full rounded-lg border p-2 text-left ${
                      selectedVideoId === video.id
                        ? "border-primary bg-primary-soft/20"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <div className="flex gap-2">
                      <img src={video.thumbnail} alt={video.title} className="h-16 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs font-semibold text-text-primary">{video.title}</p>
                        {favoriteSet.has(video.id) ? (
                          <span className="rounded bg-warning/20 px-1 py-0.5 text-[10px] font-semibold text-warning">
                            {tr("Fav")}
                          </span>
                        ) : null}
                        </div>
                        <p className="mt-1 text-[11px] text-text-muted">
                          {video.author} | {VideoService.formatDuration(video.duration)}
                        </p>
                      </div>
                    </div>
                  </SharedUi.Button>
                ))
              )}
            </div>
          </aside>

          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary p-4">
            {!selectedVideo ? (
              <div className="rounded-lg border border-border bg-bg-primary p-5 text-sm text-text-secondary">
                {tr("Select a video from the left panel.")}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
                  <img
                    src={selectedVideo.thumbnail}
                    alt={selectedVideo.title}
                    className="h-[360px] w-full rounded-xl object-cover"
                  />

                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{selectedVideo.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{selectedVideo.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedVideo.tags.map((tag) => (
                        <span
                          key={`${selectedVideo.id}-${tag}`}
                          className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span>
                        {tr("Views")}: {VideoService.formatCount(selectedVideo.views)}
                      </span>
                      <span>
                        {tr("Likes")}: {VideoService.formatCount(selectedVideo.likes)}
                      </span>
                      <span>
                        {tr("Comments")}: {VideoService.formatCount(selectedVideo.comments)}
                      </span>
                      <span>
                        {tr("Shares")}: {VideoService.formatCount(selectedVideo.shares)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <SharedUi.Button
                          onClick={() => void handleToggleLike()}
                          className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                        >
                          {selectedVideo.hasLiked ? tr("Unlike") : tr("Like")}
                        </SharedUi.Button>
                        <SharedUi.Button
                          onClick={() => void handleToggleCollect()}
                          className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                        >
                          {selectedVideo.hasCollected ? tr("Collected") : tr("Collect")}
                        </SharedUi.Button>
                        <SharedUi.Button
                          onClick={() => handleToggleFavorite(selectedVideo.id)}
                          className={`rounded-md border px-3 py-1.5 text-xs ${
                            favoriteSet.has(selectedVideo.id)
                              ? "border-warning/40 bg-warning/20 text-warning"
                              : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                          }`}
                        >
                          {favoriteSet.has(selectedVideo.id) ? tr("Favorited") : tr("Favorite")}
                        </SharedUi.Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex-1 overflow-auto rounded-lg border border-border bg-bg-primary p-3">
                  <h3 className="text-sm font-semibold text-text-primary">{tr("Comments")}</h3>
                  <div className="mt-2 space-y-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-text-secondary">{tr("No comments yet.")}</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-md border border-border bg-bg-secondary p-2">
                          <p className="text-xs font-semibold text-text-primary">{comment.userName}</p>
                          <p className="mt-1 text-xs text-text-secondary">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {statusText && <p className="mt-3 text-sm text-text-secondary">{statusText}</p>}
        {errorText && (
          <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}
      </div>
    </section>
  );
}

export default ShortVideoPage;
