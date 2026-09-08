/**
 * In-process realtime event hub.
 *
 * PA8 — instant push-based delivery for Chat and Notifications.
 *
 * This module is a process-local pub/sub built on a single Node
 * `EventEmitter`. It lets short-lived Next.js route handlers (one per
 * request) publish events that long-lived SSE streams (one per browser
 * tab) consume. The hub is the **only** realtime delivery path; the
 * old 30-second polling loops have been demoted to reconciliation
 * triggers (focus, visibility, reconnect).
 *
 * The hub is process-local. Cross-instance delivery would require a
 * shared broker (Redis pub/sub, MongoDB change streams on a replica
 * set, etc.). The current PM2 config runs **one** instance per app, so
 * single-process delivery is sufficient. The hub is structured so a
 * future broker adapter can replace the in-process emitter without
 * touching consumers — see `getHub()`.
 *
 * Authorization model:
 *
 *   - The SSE route handler resolves the authenticated session.
 *   - It subscribes the connection to the topic set the session is
 *     authorized to receive (e.g. `superadmin` for the Super Admin,
 *     `tenant:{tenantId}` for the tenant operator, plus `claim:{id}`
 *     for any claim the operator is currently viewing).
 *   - The client never tells the server which topics to subscribe to;
 *     topics are derived from the session.
 *
 * Event payload:
 *
 *   Each event is a small JSON object with `topic`, `kind`, and a
 *   domain-specific payload. The stream is text/event-stream (SSE)
 *   with a 15-second heartbeat so proxies do not close the connection.
 */

import { EventEmitter } from "node:events";

export type RealtimeTopic =
  | "superadmin"
  | `tenant:${string}`
  | `claim:${string}`;

export type RealtimeKind =
  | "notification.created"
  | "chat.message.created"
  | "chat.message.read"
  | "claim.updated"
  | "request.updated";

export interface RealtimeEvent {
  /**
   * Monotonically increasing per-process event id. SSE clients can
   * echo this back as `Last-Event-ID` to resume after a reconnect.
   */
  id: number;
  topic: RealtimeTopic;
  kind: RealtimeKind;
  /** ISO timestamp the event was published. */
  at: string;
  /** Domain-specific payload. Keep small — this is a per-event JSON. */
  data: unknown;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_LISTENERS_PER_HUB = 1_000;

declare global {
  // eslint-disable-next-line no-var
  var __remedygcc_realtime_hub__: RealtimeHub | undefined;
}

class RealtimeHub {
  private readonly emitter = new EventEmitter();
  private nextId = 1;

  constructor() {
    // The hub can have many long-lived SSE subscribers. The default
    // Node limit (10) is too low; raise it explicitly.
    this.emitter.setMaxListeners(MAX_LISTENERS_PER_HUB);
  }

  /**
   * Publish an event to all SSE subscribers of `topic`.
   *
   * Synchronous: returns immediately. The hub does not own any
   * external broker; subscribers are in-process only.
   */
  publish(topic: RealtimeTopic, kind: RealtimeKind, data: unknown): RealtimeEvent {
    const event: RealtimeEvent = {
      id: this.nextId++,
      topic,
      kind,
      at: new Date().toISOString(),
      data,
    };
    this.emitter.emit(topic, event);
    return event;
  }

  /**
   * Subscribe a long-lived SSE stream to one or more topics. The
   * returned function unsubscribes. Listeners are NOT auto-cleaned
   * on stream close — callers MUST call the returned function from
   * the stream's `cancel` / `finally` path.
   */
  subscribe(topics: RealtimeTopic[], listener: (event: RealtimeEvent) => void): () => void {
    for (const topic of topics) {
      this.emitter.on(topic, listener);
    }
    return () => {
      for (const topic of topics) {
        this.emitter.off(topic, listener);
      }
    };
  }

  /**
   * Heartbeat: emit a no-op event on a single topic so SSE streams
   * can refresh their `Last-Event-ID` and the proxy keeps the
   * connection open. The heartbeat is per-topic so consumers
   * receive their own heartbeat.
   */
  heartbeat(topic: RealtimeTopic): void {
    // We emit a synthetic event with `kind` set to a non-domain value
    // so consumers can ignore it. The event id is still useful for
    // resume semantics.
    const event: RealtimeEvent = {
      id: this.nextId++,
      topic,
      kind: "claim.updated", // closest existing kind; consumer should ignore
      at: new Date().toISOString(),
      data: { __heartbeat: true },
    };
    this.emitter.emit(topic, event);
  }
}

/**
 * Process-singleton accessor. The singleton survives Next.js hot
 * reload because the module is cached on the global object.
 */
export function getHub(): RealtimeHub {
  if (!globalThis.__remedygcc_realtime_hub__) {
    globalThis.__remedygcc_realtime_hub__ = new RealtimeHub();
  }
  return globalThis.__remedygcc_realtime_hub__;
}

export const HEARTBEAT_MS = HEARTBEAT_INTERVAL_MS;
