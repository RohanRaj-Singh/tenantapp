/**
 * Server-Sent Events stream for the TenantApp.
 *
 * PA8 — instant push-based delivery for Chat and Notifications.
 *
 * The client opens an `EventSource('/api/realtime/stream', { withCredentials: true })`.
 * The browser will:
 *   - send the existing auth cookies with the request,
 *   - reconnect automatically on disconnect,
 *   - send `Last-Event-ID` on reconnect so we can resume from the
 *     last event the client received.
 *
 * Server-side:
 *
 *   1. We resolve the authenticated session using the same auth
 *      pipeline as every other API route. If the session is invalid,
 *      we close the stream with `event: auth-error`. The client
 *      will treat this as a hard failure and surface it to the
 *      operator (it should not happen unless the operator's session
 *      really expired).
 *
 *   2. We resolve the topic set the session is authorized to receive
 *      from the session itself. The client never tells us which
 *      topics to subscribe to. For the tenant dashboard operator,
 *      the topics are:
 *        - `tenant:{tenantId}` — every notification and claim event
 *          for their tenant.
 *      For the super admin (when proxied via `x-admin-api-key`):
 *        - `superadmin` — every Super Admin-bound event.
 *      For the clinic session (Phase H clinic portal):
 *        - `tenant:{tenantId}` for the tenant the clinic user
 *          represents.
 *      Claim-level events are routed to the specific `claim:{id}`
 *      topic; the SSE stream subscribes only to the topic set the
 *      session is authorized to receive, so cross-tenant leakage is
 *      impossible.
 *
 *   3. We open a long-lived stream. We:
 *        - send a 15s heartbeat (the proxy/EventSource uses this
 *          to keep the connection open),
 *        - on each hub event for one of the subscribed topics, write
 *          a `data:` line with the JSON-encoded event,
 *        - flush after every event so the client receives it
 *          immediately.
 *
 *   4. On client disconnect (the `request.signal` aborted), we
 *      unsubscribe and clear the heartbeat timer.
 *
 * The route is the **only** realtime delivery path for Chat and
 * Notifications. The legacy 30-second polling has been demoted to
 * reconciliation triggers.
 */

import type { NextRequest } from "next/server";
import { getLocalTenantBypassAuthContext } from "@/src/modules/tenant-auth/utils/local-auth-bypass";
import { getTenantSessionCookie } from "@/src/modules/tenant-auth/cookies";
import { getCurrentTenantAuthValidation } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { getHub, HEARTBEAT_MS, type RealtimeTopic } from "@/src/server/realtime/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve the topic set for the current session. The session is the
 * single source of truth for identity. Topics are derived from the
 * session, not from any URL or client input.
 */
async function resolveTopicsForSession(
  request: NextRequest,
): Promise<{ topics: RealtimeTopic[]; reason?: string }> {
  // Local dev bypass.
  const bypass = await getLocalTenantBypassAuthContext();
  if (bypass) {
    if (bypass.tenant?.tenantId) {
      return { topics: [`tenant:${bypass.tenant.tenantId}` as RealtimeTopic] };
    }
    return { topics: [] };
  }

  // API key path — the super admin proxy in `remedygcc-admin` connects to
  // THIS stream (there is no separate admin-only stream). It authenticates
  // with `x-admin-api-key`. Subscribe it to the platform-wide `superadmin`
  // topic so it receives every notification addressed to the Super Admin
  // identity (recipientType=superAdmin).
  const apiKey = request.headers.get("x-admin-api-key");
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return { topics: ["superadmin" as RealtimeTopic] };
  }

  // Tenant dashboard session.
  const sessionToken = await getTenantSessionCookie();
  if (sessionToken) {
    const validation = await getCurrentTenantAuthValidation();
    if (validation.success && validation.context) {
      const tenantId = validation.context.tenant.tenantId;
      if (tenantId) {
        return { topics: [`tenant:${tenantId}` as RealtimeTopic] };
      }
    }
    return { topics: [], reason: "invalid_session" };
  }

  // Clinic session (Phase H clinic portal). A Clinic User may be authorized
  // for multiple tenants via `user.tenantIds[]` (multi-tenant clinic users
  // are real). Subscribe to EVERY authorized tenant topic — the previous
  // implementation only subscribed to `tenantIds[0]`, which silently
  // dropped events for the user's other authorized tenants.
  //
  // Topics are derived server-side from the authenticated session; the
  // client cannot supply arbitrary tenant IDs to subscribe to.
  const { requireClinicApiAuth } = await import(
    "@/src/modules/clinic-auth/middleware/clinic-auth"
  );
  const clinicAuth = await requireClinicApiAuth();
  if (clinicAuth.success) {
    const authorizedTenantIds = clinicAuth.context.user.tenantIds.filter(
      (t): t is string => typeof t === "string" && t.length > 0,
    );
    if (authorizedTenantIds.length > 0) {
      return {
        topics: authorizedTenantIds.map(
          (tid) => `tenant:${tid}` as RealtimeTopic,
        ),
      };
    }
  }

  return { topics: [], reason: "unauthenticated" };
}

export async function GET(request: NextRequest): Promise<Response> {
  const { topics, reason } = await resolveTopicsForSession(request);

  if (topics.length === 0) {
    // We do not want to return 401 from an SSE endpoint (the browser
    // will keep retrying with a noisy log). Instead, we return a
    // text/event-stream with a single `auth-error` event and close.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`event: auth-error\ndata: ${JSON.stringify({ reason: reason ?? "unauthenticated" })}\n\n`),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const hub = getHub();
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller is already closed (client disconnected).
          cleanup();
        }
      };

      const write = (event: { id: number; kind: string; at: string; data: unknown }) => {
        // SSE format: id: / event: / data: lines, terminated by a
        // blank line. We use `id:` so reconnecting clients can send
        // it back as `Last-Event-ID`. We do not use the `event:`
        // field — we just emit `data:` so the browser default
        // `message` event fires. (Domain type lives in the payload.)
        safeEnqueue(`id: ${event.id}\n`);
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Send an initial comment so the client knows the stream is
      // open. Browsers ignore `:`-prefixed lines.
      safeEnqueue(`: ok\n\n`);

      // Subscribe to the topic set.
      unsubscribe = hub.subscribe(topics, (event) => {
        write(event);
      });

      // Heartbeat: emit a no-op event per topic every HEARTBEAT_MS.
      heartbeat = setInterval(() => {
        for (const topic of topics) {
          hub.heartbeat(topic);
        }
      }, HEARTBEAT_MS);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Client disconnect.
      if (request.signal) {
        request.signal.addEventListener("abort", () => {
          cleanup();
        });
      }
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Nginx-style response buffering.
      "X-Accel-Buffering": "no",
    },
  });
}
