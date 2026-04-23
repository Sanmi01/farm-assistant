import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { api, streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface Props {
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

export function ChatPanel({ farmId, disabled, disabledReason }: Props) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load chat history once per farm.
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

  // Keep the message list scrolled to the latest.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col h-[560px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Chat with your advisor</h3>
        {streaming && (
          <button
            onClick={stop}
            className="text-xs px-3 py-1 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
          >
            Stop
          </button>
        )}
      </div>

      {disabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
          {disabledReason || "Chat is not available yet."}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4"
      >
        {loadingHistory && (
          <p className="text-sm text-gray-400">Loading history...</p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <p className="text-sm text-gray-400">
            Ask a question to start. Try: "What crops did you recommend and
            why?" or "Will it rain this weekend?"
          </p>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || streaming}
          placeholder={disabled ? "" : "Type a question..."}
          rows={2}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={send}
          disabled={disabled || streaming || !input.trim()}
          className="self-end bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  const bubble = isUser
    ? "bg-emerald-600 text-white"
    : message.error
    ? "bg-red-50 text-red-800 border border-red-200"
    : "bg-gray-100 text-gray-800";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${bubble}`}>
        {message.pending && !message.content ? (
          <TypingDots />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.error ? `⚠️ ${message.error}` : message.content}
          </p>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}