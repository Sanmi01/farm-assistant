import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Send, AlertCircle, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/Card";
import { InfoCard } from "@/components/InfoCard";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TypingIndicator } from "@/components/TypingIndicator";
import { cn } from "@/lib/utils";
import { api, streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  farmId: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: string;
}

const MAX_MESSAGE_LENGTH = 1000;

export function ChatPanel({ farmId, disabled, disabledReason }: ChatPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    api
      .getChatHistory(() => getToken(), farmId)
      .then((h) => {
        if (cancelled) return;
        setMessages(
          h.messages.map((m: ChatMessage) => ({
            role: m.role,
            content: m.content,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [farmId, getToken]);

  useEffect(() => {
    if (!isUserScrolling && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isUserScrolling]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 100;

    setIsUserScrolling(!isAtBottom);
    setShowScrollButton(!isAtBottom && messages.length > 0);
  };

  const scrollToBottom = () => {
    setIsUserScrolling(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || disabled) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", pending: true },
    ]);
    setStreaming(true);
    setIsUserScrolling(false);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(() => getToken(), farmId, text, {
      signal: controller.signal,
      onToken: (tok) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content: last.content + tok,
              pending: false,
            };
          }
          return copy;
        });
      },
      onError: (msg) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              error: msg,
              pending: false,
            };
          }
          return copy;
        });
      },
      onDone: () => {
        setStreaming(false);
        abortRef.current = null;
      },
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const messageLength = input.length;
  const isMessageTooLong = messageLength > MAX_MESSAGE_LENGTH;

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator =
    streaming &&
    lastMessage?.role === "assistant" &&
    lastMessage?.pending === true &&
    lastMessage?.content === "";

  return (
    <Card className="flex flex-col !p-0 overflow-hidden h-[640px]">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900">
          Chat with your advisor
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Ask about crops, weather, or anything specific to this farm.
        </p>
      </div>

      {disabled && (
        <div className="p-4 border-b border-gray-100">
          <InfoCard
            icon={AlertCircle}
            title="Chat not available yet"
            description={
              disabledReason ||
              "Chat becomes available once weather analysis and recommendations have finished."
            }
            variant="orange"
          />
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {loadingHistory && (
          <p className="text-sm text-gray-400">Loading history...</p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 max-w-md">
              <p className="text-base mb-2">
                👋 Hello! I&apos;m your AI farm advisor.
              </p>
              <p className="text-sm">
                Try: &ldquo;What crops did you recommend and why?&rdquo; or
                &ldquo;Will it rain this weekend?&rdquo;
              </p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {showTypingIndicator && <TypingIndicator />}
      </div>

      {showScrollButton && (
        <div className="px-6 pb-2">
          <div className="flex justify-center">
            <Button
              onClick={scrollToBottom}
              variant="outline"
              size="sm"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
            >
              ↓ New messages
            </Button>
          </div>
        </div>
      )}

      <div className="p-6 border-t border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              disabled
                ? "Chat is not available yet"
                : "Ask about your farm..."
            }
            disabled={disabled || streaming}
            className={cn(
              "flex-1 bg-white",
              isMessageTooLong &&
                "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20",
              disabled && "cursor-not-allowed opacity-60",
            )}
          />
          {streaming ? (
            <Button
              type="button"
              onClick={stop}
              variant="destructive"
              className="px-4"
            >
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              onClick={send}
              disabled={disabled || !input.trim() || isMessageTooLong}
              className="bg-emerald-600 hover:bg-emerald-700 px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex justify-end mt-2 px-1">
          <span
            className={cn(
              "text-xs",
              isMessageTooLong
                ? "text-red-600 font-medium"
                : "text-gray-500",
            )}
          >
            {messageLength}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
      </div>
    </Card>
  );
}

interface MessageBubbleProps {
  message: DisplayMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const bubbleClasses = isUser
    ? "bg-emerald-600 text-white"
    : message.error
      ? "bg-red-50 text-red-800 border border-red-200"
      : "bg-gray-100 text-gray-900";

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  return (
    <div
      className={cn("flex group", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", bubbleClasses)}>
        {message.error ? (
          <p className="text-sm">⚠️ {message.error}</p>
        ) : isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="text-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {!isUser && message.content && !message.error && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-gray-500 hover:text-emerald-600 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}