"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Megaphone, Loader2, Send } from "lucide-react";

interface ChatMessage {
  messageId: string;
  type: "text" | "official_update";
  participant: { role: string; id: string; name: string };
  body: string;
  createdAt: string;
}

interface ClaimChatProps {
  claimId: string;
  /** Base URL for the claim's messages, e.g. `/api/reimbursements/{id}/messages`. */
  apiBase: string;
  /** Hide the composer (super-admin oversight view). */
  readOnly?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClaimChat({ claimId, apiBase, readOnly = false }: ClaimChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (markRead: boolean) => {
      try {
        const res = await fetch(apiBase);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages ?? []);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
      if (markRead) {
        try {
          await fetch(`${apiBase}/read`, { method: "POST" });
        } catch {
          /* ignore */
        }
      }
    },
    [apiBase],
  );

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Keep the newest message in view
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send message.");
      }
      setText("");
      await fetchMessages(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [text, sending, apiBase, fetchMessages]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Chat</h3>
      </div>

      <div
        ref={listRef}
        className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3"
      >
        {loading && (
          <p className="py-6 text-center text-xs text-slate-400">Loading messages…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">
            No messages yet. Start a conversation about this claim.
          </p>
        )}
        {messages.map((msg) =>
          msg.type === "official_update" ? (
            <div key={msg.messageId} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Official update
                </span>
                <span className="ml-auto text-[11px] text-blue-400">
                  {msg.participant.name} · {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ) : (
            <div key={msg.messageId} className="rounded-lg bg-white p-3 shadow-sm border border-slate-100">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">{msg.participant.name}</span>
                <span className="text-[11px] text-slate-400">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ),
        )}
      </div>

      {!readOnly && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write a message to the employee…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
