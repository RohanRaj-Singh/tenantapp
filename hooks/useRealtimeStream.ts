/**
 * SSE client hook for the TenantApp.
 *
 * PA8 — instant push-based delivery for Chat and Notifications.
 *
 * Opens a single `EventSource` to `/api/realtime/stream`. The hook:
 *
 *   - reconnects automatically on disconnect (browser-native
 *     `EventSource` behavior),
 *   - dispatches events to registered handlers by `kind`,
 *   - provides connection state (`connected` / `reconnecting`),
 *   - cleans up on unmount.
 *
 * The hook is mounted once by the claim detail page (or by the
 * `ClaimChat` component) and shared across the tenantapp. Multiple
 * components can register handlers for different event kinds; the
 * hook multiplexes them onto a single SSE connection.
 *
 * Usage:
 *
 *   const { connected, on } = useRealtimeStream();
 *   useEffect(() => {
 *     return on('chat.message.created', (event) => {
 *       // handle message
 *     });
 *   }, [on]);
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RealtimeEvent {
  id: number;
  topic: string;
  kind: string;
  at: string;
  data: unknown;
}

type EventHandler = (event: RealtimeEvent) => void;

interface UseRealtimeStreamResult {
  /** Whether the SSE connection is currently open and receiving events. */
  connected: boolean;
  /**
   * Register a handler for a specific event kind. Returns an
   * unsubscribe function (suitable for useEffect cleanup).
   */
  on: (kind: string, handler: EventHandler) => () => void;
}

export function useRealtimeStream(): UseRealtimeStreamResult {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const sourceRef = useRef<EventSource | null>(null);

  const on = useCallback((kind: string, handler: EventHandler) => {
    let set = handlersRef.current.get(kind);
    if (!set) {
      set = new Set();
      handlersRef.current.set(kind, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) {
        handlersRef.current.delete(kind);
      }
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/realtime/stream", {
      withCredentials: true,
    });
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
    };

    source.onerror = () => {
      // EventSource will auto-reconnect. We mark as disconnected
      // until onopen fires again.
      setConnected(false);
    };

    source.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        // Ignore heartbeat events (they have a __heartbeat flag in data).
        if (
          parsed.data &&
          typeof parsed.data === "object" &&
          "__heartbeat" in (parsed.data as Record<string, unknown>)
        ) {
          return;
        }
        const handlers = handlersRef.current.get(parsed.kind);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(parsed);
            } catch {
              /* handler error — do not break other handlers */
            }
          }
        }
      } catch {
        /* malformed event — ignore */
      }
    };

    // Handle auth-error events (the stream sends this when the
    // session is invalid). We close the source and do not reconnect.
    source.addEventListener("auth-error", () => {
      source.close();
      setConnected(false);
    });

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, []);

  return { connected, on };
}
