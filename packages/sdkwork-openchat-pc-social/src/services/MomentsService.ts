import { getAppSdkClientWithSession, type Page, type Result } from "@sdkwork/openchat-pc-kernel";
import type { Comment, Moment, MomentFilter, PublishMomentData, SocialStats } from "../types";

const now = Date.now();

const seedMoments: Moment[] = [
  {
    id: "moment-1",
    author: "Omni Vision",
    authorId: "user-1",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Omni",
    content:
      "Built a reusable agent workflow pipeline today. The biggest win was reducing context switches between model and tool execution.",
    images: ["https://picsum.photos/720/420?random=401"],
    comments: [
      {
        id: "comment-1",
        userId: "user-2",
        userName: "Mia",
        text: "Great summary. Can you share the routing strategy details?",
        createTime: now - 2 * 60 * 60 * 1000,
      },
    ],
    likes: 36,
    hasLiked: false,
    likedBy: ["user-2", "user-3"],
    location: "Shanghai",
    isPublic: true,
    createTime: now - 4 * 60 * 60 * 1000,
    updateTime: now - 4 * 60 * 60 * 1000,
  },
  {
    id: "moment-2",
    author: "Current User",
    authorId: "current_user",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
    content:
      "Finished the package split and switched module pages to API-first service calls. The app shell now stays much cleaner.",
    images: [],
    comments: [],
    likes: 12,
    hasLiked: true,
    likedBy: ["user-1"],
    isPublic: true,
    createTime: now - 10 * 60 * 60 * 1000,
    updateTime: now - 10 * 60 * 60 * 1000,
  },
];

type PartialPage<T> = Partial<Page<T>> & { list?: T[]; pageSize?: number };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTimestamp(value: unknown, fallback = Date.now()): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return fallback;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) {
    return "just now";
  }

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "just now";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} min ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} h ago`;
  }
  return `${Math.floor(diff / day)} d ago`;
}

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const result = response as Partial<Result<T>>;
    return {
      success: Boolean(result.success),
      data: (result.data as T | undefined) ?? defaultData,
      message: typeof result.message === "string" ? result.message : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      code: typeof result.code === "number" ? result.code : undefined,
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: ((response as { data: T }).data ?? defaultData) as T };
  }

  if (response === undefined || response === null) {
    return { success: true, data: defaultData };
  }

  return { success: true, data: response as T };
}

function normalizeComment(input: Partial<Comment>): Comment {
  return {
    id: input.id || createId("comment"),
    userId: input.userId || "unknown",
    userName: input.userName || "Unknown",
    userAvatar: input.userAvatar,
    text: input.text || "",
    createTime: toNumber(input.createTime, Date.now()),
    replyTo: input.replyTo,
  };
}

function normalizeMoment(input: Partial<Moment>): Moment {
  const raw = input as Omit<Partial<Moment>, "author"> & {
    author?: string | { id?: string | number; name?: string; avatar?: string };
    summary?: string;
    coverImage?: string;
    likeCount?: number;
    isLiked?: boolean;
    createdAt?: string | number;
    updatedAt?: string | number;
  };
  const comments = Array.isArray(raw.comments)
    ? raw.comments.map((comment) => normalizeComment(comment as Partial<Comment>))
    : [];
  const createTime = toTimestamp(raw.createTime ?? raw.createdAt, Date.now());
  const authorIdRaw = raw.authorId ?? (typeof raw.author === "string" ? undefined : raw.author?.id);
  const authorName = typeof raw.author === "string" ? raw.author : raw.author?.name;
  const avatar = raw.avatar ?? (typeof raw.author === "string" ? undefined : raw.author?.avatar);
  const content = raw.content || raw.summary || "";
  const images = Array.isArray(raw.images)
    ? raw.images.filter((item): item is string => typeof item === "string")
    : typeof raw.coverImage === "string" && raw.coverImage.length > 0
      ? [raw.coverImage]
      : [];

  return {
    id: String(raw.id || createId("moment")),
    author: typeof authorName === "string" ? authorName : "Unknown",
    authorId: authorIdRaw == null ? "unknown" : String(authorIdRaw),
    avatar: typeof avatar === "string" && avatar.length > 0 ? avatar : "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown",
    content,
    images,
    comments,
    likes: Math.max(0, toNumber(raw.likes ?? raw.likeCount)),
    hasLiked: Boolean(raw.hasLiked ?? raw.isLiked),
    likedBy: Array.isArray(raw.likedBy) ? raw.likedBy.filter((item): item is string => typeof item === "string") : [],
    location: raw.location,
    displayTime: raw.displayTime || formatRelativeTime(createTime),
    isPublic: raw.isPublic === undefined ? true : Boolean(raw.isPublic),
    createTime,
    updateTime: toTimestamp(raw.updateTime ?? raw.updatedAt, createTime),
  };
}

function normalizePage(input: unknown, page: number, size: number): Page<Moment> {
  const payload = (Array.isArray(input) ? {} : (input as PartialPage<unknown>)) as PartialPage<unknown>;
  const source = Array.isArray(input)
    ? input
    : Array.isArray(payload.content)
      ? payload.content
      : Array.isArray(payload.list)
        ? payload.list
        : [];
  const content = source.map((item) => normalizeMoment(item as Partial<Moment>));
  const total = toNumber(payload.total, content.length);
  const currentPage = toNumber(payload.page, page);
  const currentSize = toNumber(payload.size ?? payload.pageSize, size);

  return {
    content,
    total,
    page: currentPage,
    size: currentSize,
    totalPages: toNumber(payload.totalPages, Math.max(1, Math.ceil(total / Math.max(1, currentSize)))),
  };
}

function normalizeStats(input: Partial<SocialStats>): SocialStats {
  return {
    totalMoments: toNumber(input.totalMoments),
    totalLikes: toNumber(input.totalLikes),
    totalComments: toNumber(input.totalComments),
    followers: toNumber(input.followers),
    following: toNumber(input.following),
  };
}

class MomentsServiceImpl {
  private fallbackMoments: Moment[] = seedMoments.map((item) => ({ ...item }));
  private currentUserId = "current_user";
  private currentUserName = "Current User";
  private currentUserAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser";

  async getFeed(
    filter: MomentFilter = {},
    page: number = 1,
    size: number = 10,
  ): Promise<Result<Page<Moment>>> {
    const fallbackData = normalizePage({ content: [], total: 0, page, size }, page, size);
    const response = await getAppSdkClientWithSession().feed.getFeedList({
      authorId: filter.authorId,
      isPublic: filter.isPublic,
      startTime: filter.startTime,
      endTime: filter.endTime,
      page,
      size,
    });
    const result = toResult<unknown>(response, fallbackData);
    if (!result.success) {
      return { ...result, data: fallbackData };
    }
    const normalized = normalizePage(result.data, page, size);
    this.fallbackMoments = normalized.content.map((item) => ({ ...item }));
    return { ...result, data: normalized };
  }

  async publish(data: PublishMomentData): Promise<Result<Moment>> {
    const fallbackData = normalizeMoment({
      id: createId("moment"),
      author: this.currentUserName,
      authorId: this.currentUserId,
      avatar: this.currentUserAvatar,
      content: data.content,
      images: data.images,
      comments: [],
      likes: 0,
      hasLiked: false,
      likedBy: [],
      location: data.location,
      isPublic: data.isPublic,
      createTime: Date.now(),
      updateTime: Date.now(),
    });
    const response = await getAppSdkClientWithSession().feed.create({
      content: data.content,
      title: data.content.slice(0, 32),
      images: data.images,
      source: data.location,
    });
    const result = toResult<unknown>(response, fallbackData);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }
    const moment = normalizeMoment((result.data ?? fallbackData) as Partial<Moment>);
    this.fallbackMoments = [moment, ...this.fallbackMoments];
    return { success: true, data: moment };
  }

  async likeMoment(id: string): Promise<Result<void>> {
    const response = await getAppSdkClientWithSession().feed.like(id);
    const result = toResult<unknown>(response, undefined);
    if (result.success) {
      this.fallbackMoments = this.fallbackMoments.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const hasLiked = !item.hasLiked;
        const likes = hasLiked ? item.likes + 1 : Math.max(0, item.likes - 1);
        const likedBy = hasLiked
          ? Array.from(new Set([...item.likedBy, this.currentUserId]))
          : item.likedBy.filter((userId) => userId !== this.currentUserId);

        return {
          ...item,
          hasLiked,
          likes,
          likedBy,
          updateTime: Date.now(),
        };
      });
    }
    return result.success
      ? { success: true, message: result.message }
      : { success: false, message: result.message || result.error };
  }

  async addComment(
    momentId: string,
    text: string,
    replyTo?: { userId: string; userName: string },
  ): Promise<Result<Comment>> {
    const response = await getAppSdkClientWithSession().comment.createComment({
      targetId: momentId,
      text,
      replyTo,
    } as any);
    const result = toResult<unknown>(response, undefined);
    if (!result.success) {
      return { success: false, message: result.message || result.error };
    }

    const comment = normalizeComment(
      ((result.data as Partial<Comment> | undefined) ?? {
        userId: this.currentUserId,
        userName: this.currentUserName,
        userAvatar: this.currentUserAvatar,
        text,
        replyTo,
        createTime: Date.now(),
      }) as Partial<Comment>,
    );

    const index = this.fallbackMoments.findIndex((item) => item.id === momentId);
    if (index >= 0) {
      this.fallbackMoments[index] = {
        ...this.fallbackMoments[index],
        comments: [...this.fallbackMoments[index].comments, comment],
        updateTime: Date.now(),
      };
    }
    return { success: true, data: comment, message: result.message };
  }

  async deleteComment(momentId: string, commentId: string): Promise<Result<void>> {
    const response = await getAppSdkClientWithSession().comment.deleteComment(commentId);
    const result = toResult<unknown>(response, undefined);
    if (result.success) {
      const index = this.fallbackMoments.findIndex((item) => item.id === momentId);
      if (index >= 0) {
        this.fallbackMoments[index] = {
          ...this.fallbackMoments[index],
          comments: this.fallbackMoments[index].comments.filter((comment) => comment.id !== commentId),
          updateTime: Date.now(),
        };
      }
    }
    return result.success
      ? { success: true, message: result.message }
      : { success: false, message: result.message || result.error };
  }

  async deleteMoment(id: string): Promise<Result<void>> {
    const response = await getAppSdkClientWithSession().feed.delete(id);
    const result = toResult<unknown>(response, undefined);
    if (result.success) {
      this.fallbackMoments = this.fallbackMoments.filter((item) => item.id !== id);
    }
    return result.success
      ? { success: true, message: result.message }
      : { success: false, message: result.message || result.error };
  }

  async getStats(userId?: string): Promise<Result<SocialStats>> {
    const [feedResponse, followResponse] = await Promise.all([
      getAppSdkClientWithSession().feed.getFeedList({ authorId: userId, page: 1, size: 200 }),
      getAppSdkClientWithSession().social.getFollowStats(),
    ]);
    const feedResult = toResult<unknown>(feedResponse, []);
    const followResult = toResult<unknown>(followResponse, {});
    const feedList = normalizePage(feedResult.data, 1, 200).content;
    const followStats = (followResult.data || {}) as Partial<SocialStats>;
    return {
      success: true,
      data: normalizeStats({
        totalMoments: feedList.length,
        totalLikes: feedList.reduce((sum, item) => sum + item.likes, 0),
        totalComments: feedList.reduce((sum, item) => sum + item.comments.length, 0),
        followers: toNumber((followStats as any).followers, 0),
        following: toNumber((followStats as any).following, 0),
      }),
    };
  }
}

export const MomentsService = new MomentsServiceImpl();

