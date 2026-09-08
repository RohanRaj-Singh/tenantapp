'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeStream, type RealtimeEvent } from '@/hooks/useRealtimeStream';
import { playNotificationSound, unlockAudio } from '@/lib/realtime/notificationSound';
import { sendBrowserNotification } from '@/lib/realtime/browserNotify';
import { setTabTitleUnread } from '@/lib/realtime/tabTitle';

const SOUND_PREF_KEY = 'remedy:notify-sound';
const BROWSER_PREF_KEY = 'remedy:notify-browser';
const TOAST_TTL_MS = 4500;
const MAX_TOASTS = 3;
const MAX_NOTIFICATIONS_KEPT = 50;

export interface RealtimeNotification {
  notificationId: string;
  claimId: string;
  claimNumber?: string;
  requestId?: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface RealtimeToast {
  toastId: string;
  notificationId: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
}

type SseHandler = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  connected: boolean;
  unreadCount: number;
  notifications: RealtimeNotification[];
  toasts: RealtimeToast[];
  soundEnabled: boolean;
  browserNotifyEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setBrowserNotifyEnabled: (enabled: boolean) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (toastId: string) => void;
  /** Shared SSE subscription — same shape as the standalone `useRealtimeStream`. */
  sse: {
    connected: boolean;
    on: (kind: string, handler: SseHandler) => () => void;
  };
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  /** Claim path prefix for deep links (e.g. `/reimbursements` or `/clinic/claims`). */
  claimPathPrefix?: string;
}

function buildHref(notification: RealtimeNotification, claimPathPrefix: string): string {
  if (notification.type === 'claim_request' && notification.requestId) {
    return `${claimPathPrefix}/${encodeURIComponent(notification.claimId)}/requests/${encodeURIComponent(notification.requestId)}`;
  }
  return `${claimPathPrefix}/${encodeURIComponent(notification.claimId)}`;
}

export function RealtimeProvider({ children, claimPathPrefix = '/reimbursements' }: RealtimeProviderProps) {
  const router = useRouter();
  const { connected, on } = useRealtimeStream();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [browserNotifyEnabled, setBrowserNotifyEnabledState] = useState(false);
  const wasConnectedRef = useRef(false);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setSoundEnabledState(window.localStorage.getItem(SOUND_PREF_KEY) === '1');
      setBrowserNotifyEnabledState(window.localStorage.getItem(BROWSER_PREF_KEY) === '1');
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(typeof data.count === 'number' ? data.count : 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void fetchUnread();
  }, [fetchUnread]);

  // Reflect the unread notification count in the browser tab title. The
  // base tenant name is layered in by TenantTabTitle via the same store.
  useEffect(() => {
    setTabTitleUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    return () => {
      // Leaving a realtime surface drops this provider's unread state —
      // clear the "(N)" prefix so the base tenant title stays clean.
      setTabTitleUnread(0);
    };
  }, []);

  useEffect(() => {
    return on('notification.created', (event: RealtimeEvent) => {
      const data = event.data as RealtimeNotification | null;
      if (!data || !data.notificationId) return;

      const item: RealtimeNotification = {
        notificationId: data.notificationId,
        claimId: data.claimId ?? '',
        claimNumber: data.claimNumber,
        requestId: data.requestId,
        type: data.type ?? 'general',
        title: data.title ?? 'New notification',
        body: data.body ?? '',
        read: false,
        createdAt: data.createdAt ?? new Date().toISOString(),
      };

      setNotifications((prev) => {
        const without = prev.filter((n) => n.notificationId !== item.notificationId);
        return [item, ...without].slice(0, MAX_NOTIFICATIONS_KEPT);
      });
      setUnreadCount((prev) => prev + 1);

      const toast: RealtimeToast = {
        toastId: `toast-${item.notificationId}-${Date.now()}`,
        notificationId: item.notificationId,
        title: item.title,
        body: item.body,
        href: buildHref(item, claimPathPrefix),
        createdAt: item.createdAt,
      };
      setToasts((prev) => [...prev, toast].slice(-MAX_TOASTS));

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId));
        toastTimersRef.current.delete(toast.toastId);
      }, TOAST_TTL_MS);
      toastTimersRef.current.set(toast.toastId, timer);

      if (soundEnabled) playNotificationSound();
      if (browserNotifyEnabled) {
        sendBrowserNotification(item.title, {
          body: item.body,
          tag: item.notificationId,
          href: buildHref(item, claimPathPrefix),
        });
      }
    });
  }, [on, soundEnabled, browserNotifyEnabled, claimPathPrefix]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      void fetchUnread();
    }
    wasConnectedRef.current = connected;
  }, [connected, fetchUnread]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (enabled) unlockAudio();
  }, []);

  const setBrowserNotifyEnabled = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setBrowserNotifyEnabledState(false);
      try {
        window.localStorage.setItem(BROWSER_PREF_KEY, '0');
      } catch {
        /* ignore */
      }
      return;
    }
    const { requestBrowserNotifyPermission } = await import('@/lib/realtime/browserNotify');
    const result = await requestBrowserNotifyPermission();
    const granted = result === 'granted';
    setBrowserNotifyEnabledState(granted);
    try {
      window.localStorage.setItem(BROWSER_PREF_KEY, granted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setUnreadCount((u) => Math.max(0, u - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n)),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    const timer = toastTimersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(toastId);
    }
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      unreadCount,
      notifications,
      toasts,
      soundEnabled,
      browserNotifyEnabled,
      setSoundEnabled,
      setBrowserNotifyEnabled,
      markRead,
      markAllRead,
      dismissToast,
      sse: { connected, on },
    }),
    [
      connected,
      unreadCount,
      notifications,
      toasts,
      soundEnabled,
      browserNotifyEnabled,
      setSoundEnabled,
      setBrowserNotifyEnabled,
      markRead,
      markAllRead,
      dismissToast,
      on,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <RealtimeToastBridge router={router} />
    </RealtimeContext.Provider>
  );
}

function RealtimeToastBridge({ router }: { router: ReturnType<typeof useRouter> }) {
  const ctx = useContext(RealtimeContext);
  if (!ctx) return null;
  return <RealtimeToastsContainer toasts={ctx.toasts} onDismiss={ctx.dismissToast} router={router} />;
}

function RealtimeToastsContainer({
  toasts,
  onDismiss,
  router,
}: {
  toasts: RealtimeToast[];
  onDismiss: (id: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.toastId}
          type="button"
          onClick={() => {
            onDismiss(t.toastId);
            router.push(t.href);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-lg transition hover:bg-slate-50"
        >
          <p className="text-sm font-semibold text-slate-900">{t.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.body}</p>
        </button>
      ))}
    </div>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return ctx;
}

/**
 * Shared SSE subscription hook — same shape as the legacy standalone
 * `useRealtimeStream` hook. Reads from the provider's single EventSource.
 *
 * Import this from `@/components/realtime/RealtimeProvider` instead of
 * `@/hooks/useRealtimeStream` to share the connection.
 */
export function useSharedRealtimeStream(): {
  connected: boolean;
  on: (kind: string, handler: SseHandler) => () => void;
} {
  const { sse } = useRealtime();
  return sse;
}
