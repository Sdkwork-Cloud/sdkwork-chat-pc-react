import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export interface EmojiItem {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorEl?: HTMLElement | null;
}

const RECENT_EMOJI_STORAGE_KEY = "openchat.recent-emojis";

const defaultEmojis: EmojiItem[] = [
  { id: "1", emoji: "\u{1F600}", name: "grinning", category: "Frequently Used" },
  { id: "2", emoji: "\u{1F603}", name: "smiley", category: "Frequently Used" },
  { id: "3", emoji: "\u{1F604}", name: "smile", category: "Frequently Used" },
  { id: "4", emoji: "\u{1F609}", name: "wink", category: "Frequently Used" },
  { id: "5", emoji: "\u{1F60A}", name: "blush", category: "Frequently Used" },
  { id: "6", emoji: "\u{1F60E}", name: "sunglasses", category: "Emotion" },
  { id: "7", emoji: "\u{1F62E}", name: "open_mouth", category: "Emotion" },
  { id: "8", emoji: "\u{1F622}", name: "cry", category: "Emotion" },
  { id: "9", emoji: "\u{1F62D}", name: "sob", category: "Emotion" },
  { id: "10", emoji: "\u{1F631}", name: "scream", category: "Emotion" },
  { id: "11", emoji: "\u{1F44D}", name: "thumbs_up", category: "Hands" },
  { id: "12", emoji: "\u{1F44E}", name: "thumbs_down", category: "Hands" },
  { id: "13", emoji: "\u{270C}", name: "victory", category: "Hands" },
  { id: "14", emoji: "\u{1F44F}", name: "clap", category: "Hands" },
  { id: "15", emoji: "\u{1F64C}", name: "raised_hands", category: "Hands" },
  { id: "16", emoji: "\u{1F436}", name: "dog", category: "Animals" },
  { id: "17", emoji: "\u{1F431}", name: "cat", category: "Animals" },
  { id: "18", emoji: "\u{1F43C}", name: "panda", category: "Animals" },
  { id: "19", emoji: "\u{1F98A}", name: "fox", category: "Animals" },
  { id: "20", emoji: "\u{1F424}", name: "chick", category: "Animals" },
];

const categories = Array.from(new Set(defaultEmojis.map((emoji) => emoji.category)));

export const EmojiPicker = memo(({
  isOpen,
  onClose,
  onSelect,
  anchorEl,
}: EmojiPickerProps) => {
  const { tr } = useAppTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0] || "Frequently Used");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
      if (!stored) {
        setRecentEmojis([]);
        return;
      }

      const parsed = JSON.parse(stored);
      setRecentEmojis(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
    } catch {
      setRecentEmojis([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const filteredEmojis = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      return defaultEmojis.filter(
        (emoji) =>
          emoji.name.toLowerCase().includes(normalizedQuery) ||
          emoji.emoji.includes(normalizedQuery),
      );
    }

    return defaultEmojis.filter((emoji) => emoji.category === activeCategory);
  }, [activeCategory, searchQuery]);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      setRecentEmojis((previous) => {
        const nextRecent = [emoji, ...previous.filter((value) => value !== emoji)].slice(0, 16);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(nextRecent));
        }
        return nextRecent;
      });
      onClose();
    },
    [onClose, onSelect],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 w-[360px] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        bottom: anchorEl ? "100%" : "auto",
        left: anchorEl ? "0" : "auto",
        marginBottom: anchorEl ? "12px" : "0",
      }}
    >
      <div className="border-b border-border p-3">
        <div className="group relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={tr("Search emojis...")}
            className="h-9 w-full rounded-lg border border-border bg-bg-tertiary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="h-[280px] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
        {searchQuery ? (
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                aria-label={emoji.name}
                onClick={() => handleSelect(emoji.emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-2xl transition-all duration-200 hover:scale-110 hover:bg-bg-hover"
                title={emoji.name}
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        ) : (
          <>
            {recentEmojis.length > 0 && activeCategory === "Frequently Used" ? (
              <div className="mb-4">
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-text-muted">
                  {tr("Recently used")}
                </h3>
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.map((emoji, index) => (
                    <button
                      key={`recent-${index}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-2xl transition-all duration-200 hover:scale-110 hover:bg-bg-hover"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  type="button"
                  aria-label={emoji.name}
                  onClick={() => handleSelect(emoji.emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-2xl transition-all duration-200 hover:scale-110 hover:bg-bg-hover"
                  title={emoji.name}
                >
                  {emoji.emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {filteredEmojis.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted">
            <svg className="mb-2 h-12 w-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{tr("No emojis found.")}</span>
          </div>
        ) : null}
      </div>

      {!searchQuery ? (
        <div className="flex items-center overflow-x-auto border-t border-border bg-bg-secondary/50 px-2 py-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`mr-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {tr(category)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

EmojiPicker.displayName = "EmojiPicker";

export default EmojiPicker;
