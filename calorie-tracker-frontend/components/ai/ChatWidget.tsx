"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiError, apiClient } from "@/lib/apiClient";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ChatResponse = {
  reply: string;
};

type ChatWidgetProps = {
  onMealDataChanged: () => void;
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Ask about your goals, request a daily summary, or tell me what you ate.",
};

export function ChatWidget({ onMealDataChanged }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const retryRef = useRef<{ message: string; idempotencyKey: string }>();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, isSending, messages]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) {
      return;
    }

    setDraft("");
    setError(undefined);
    setIsSending(true);
    const pendingRetry = retryRef.current;
    const isRetry = pendingRetry?.message === message;
    const idempotencyKey = isRetry ? pendingRetry.idempotencyKey : crypto.randomUUID();
    retryRef.current = { message, idempotencyKey };
    if (!isRetry) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: message },
      ]);
    }

    try {
      const response = await apiClient<ChatResponse>("/api/ai/chat", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: { message },
      });
      retryRef.current = undefined;
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: response.reply },
      ]);

      // The current API returns natural language rather than a structured action flag. Refreshing
      // after every successful response guarantees chat-created meals appear without guessing from
      // the wording of the assistant's reply.
      onMealDataChanged();
    } catch (requestError) {
      setDraft(message);
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : "The nutrition assistant could not respond. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[65] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="false"
            aria-labelledby="nutrition-chat-title"
            className="mb-3 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:w-96"
          >
            <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-700">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 id="nutrition-chat-title" className="text-sm font-semibold text-zinc-900">
                    Nutrition assistant
                  </h2>
                  <p className="text-[0.65rem] text-zinc-600">AI-powered meal and goal support</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close nutrition assistant"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div
              ref={feedRef}
              className="flex-1 space-y-3 overflow-y-auto bg-zinc-50/60 p-4"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {message.role === "user" ? (
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-950 px-3.5 py-2.5 text-sm leading-5 text-white">
                      {message.content}
                    </p>
                  ) : (
                    <AssistantMessage content={message.content} />
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-600 shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Thinking…
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={submitMessage} className="border-t border-zinc-100 bg-white p-3">
              {error && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <label htmlFor="nutrition-chat-message" className="sr-only">
                  Message the nutrition assistant
                </label>
                <input
                  ref={inputRef}
                  id="nutrition-chat-message"
                  value={draft}
                  maxLength={500}
                  disabled={isSending}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setError(undefined);
                  }}
                  placeholder="Ask or log a meal…"
                  className="form-input h-11 flex-1"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={isSending || !draft.trim()}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <p className="mt-2 px-1 text-[0.65rem] text-zinc-400">Verify AI-generated nutrition values.</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={isOpen ? "Close nutrition assistant" : "Open nutrition assistant"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-[0_14px_35px_-12px_rgba(13,148,136,0.75)] transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
      >
        {isOpen ? <X className="h-5 w-5" aria-hidden /> : <MessageCircle className="h-5 w-5" aria-hidden />}
      </motion.button>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const lines = normalizeAssistantReply(content);

  return (
    <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-5 text-zinc-700 shadow-sm">
      {lines.map((line, index) => {
        const bullet = line.match(/^(?:[-*•])\s+(.+)$/);
        if (bullet) {
          return (
            <div key={`${index}-${line}`} className="flex items-start gap-2">
              <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
              <p className="min-w-0">{renderInlineFormatting(bullet[1])}</p>
            </div>
          );
        }
        return <p key={`${index}-${line}`}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function normalizeAssistantReply(content: string): string[] {
  return content
    .replace(/\r\n?/g, "\n")
    .replace(/\s+(?=\*\*(?:daily totals?|goal progress)[^*]*\*\*)/gi, "\n")
    // Some model responses contain Markdown bullets but omit the newline before them.
    .replace(/\s+\*\s+(?=(?:\*\*)?[A-Z0-9])/g, "\n* ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderInlineFormatting(value: string): React.ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${index}-${part}`} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${index}-${part}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`${index}-${part}`}>{part}</span>;
  });
}
