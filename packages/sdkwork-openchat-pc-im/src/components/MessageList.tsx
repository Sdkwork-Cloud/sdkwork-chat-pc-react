
import { useRef, useEffect, memo } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import type { Message } from "../entities/message.entity";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

export const MessageList = memo(({ messages, isTyping: _isTyping }: MessageListProps) => {
  const { tr } = useAppTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 px-4 py-2 bg-primary-soft border border-primary-medium rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-xs text-primary font-medium">{tr("AI assistant connected")}</span>
        </div>
      </div>

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = "MessageList";
