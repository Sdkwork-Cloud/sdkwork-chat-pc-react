import { memo, useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Message } from "../entities/message.entity";
import { MessageBubble } from "./MessageBubble";

interface VirtualizedMessageListProps {
  messages: Message[];
  isTyping: boolean;
}

function estimateMessageHeight(message: Message): number {
  const baseHeight = 80;
  const contentLength = message.content?.text?.length || 0;

  if (contentLength > 500) {
    return baseHeight + 200;
  }
  if (contentLength > 200) {
    return baseHeight + 100;
  }
  if (contentLength > 100) {
    return baseHeight + 50;
  }
  if (message.type === "image" || message.type === "video") {
    return baseHeight + 250;
  }

  return baseHeight;
}

export const VirtualizedMessageList = memo(
  ({ messages, isTyping: _isTyping }: VirtualizedMessageListProps) => {
    const { tr } = useAppTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const shouldScrollToBottomRef = useRef(true);

    const virtualizer = useVirtualizer({
      count: messages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: useCallback(
        (index: number) => estimateMessageHeight(messages[index]),
        [messages],
      ),
      overscan: 5,
      measureElement: (element) => element.getBoundingClientRect().height,
    });

    const handleScroll = useCallback(() => {
      if (!parentRef.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      shouldScrollToBottomRef.current =
        scrollHeight - scrollTop - clientHeight < 100;
    }, []);

    useEffect(() => {
      if (shouldScrollToBottomRef.current && messages.length > 0) {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: "end",
          behavior: "smooth",
        });
      }
    }, [messages.length, virtualizer]);

    return (
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-6 py-5"
        onScroll={handleScroll}
      >
        <div className="mb-6 flex items-center justify-center">
          <div className="flex items-center space-x-2 rounded-full border border-[rgba(14,165,233,0.2)] bg-[rgba(14,165,233,0.1)] px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-[#0EA5E9]" />
            <span className="text-xs text-[#0EA5E9]">
              {tr("AI assistant connected")}
            </span>
          </div>
        </div>

        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];

            return (
              <div
                key={message.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageBubble message={message} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

VirtualizedMessageList.displayName = "VirtualizedMessageList";
