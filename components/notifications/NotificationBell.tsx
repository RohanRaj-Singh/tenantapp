"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Inbox,
  Radio,
  RefreshCw,
  X,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { RealtimeSettings } from "@/components/realtime/RealtimeSettings";
import { cn } from "@/lib/utils";

interface NotificationItem {
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

type Filter = "all" | "unread";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86_400 * 7) return `${Math.floor(diff / 86_400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Map notification type to icon and color */
function visualForType(type: string) {
  switch (type) {
    case "claim_approved":
    case "claim_paid":
    case "claim_payment_queued":
      return { Icon: CheckCircle2, color: "text-emerald-600", bgClass: "bg-emerald-50", ringClass: "ring-emerald-100" };
    case "claim_rejected":
      return { Icon: AlertCircle, color: "text-red-600", bgClass: "bg-red-50", ringClass: "ring-red-100" };
    case "claim_frozen":
      return { Icon: Clock, color: "text-sky-600", bgClass: "bg-sky-50", ringClass: "ring-sky-100" };
    case "claim_in_progress":
    case "submitted":
    case "resubmitted":
      return { Icon: Clock, color: "text-amber-600", bgClass: "bg-amber-50", ringClass: "ring-amber-100" };
    default:
      return { Icon: Bell, color: "text-slate-600", bgClass: "bg-slate-50", ringClass: "ring-slate-100" };
  }
}

interface NotificationBellProps {
  /** Base path for a claim notification — tenant admin uses `/reimbursements`, clinic portal uses `/clinic/claims`. */
  claimPathPrefix?: string;
}

export default function NotificationBell({ claimPathPrefix = "/reimbursements" }: NotificationBellProps) {
  const router = useRouter();
  const { unreadCount, notifications, markRead, markAllRead, connected } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications?limit=50");
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  // Refresh on open
  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const handleItemClick = useCallback(
    async (n: NotificationItem) => {
      if (!n.read) await markRead(n.notificationId);
      setOpen(false);
      router.push(`${claimPathPrefix}/${n.claimId}`);
    },
    [markRead, router, claimPathPrefix],
  );

  return (
    <div className="relative flex items-center gap-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close notifications" : "Open notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {!connected && (
          <span
            className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
            title="Reconnecting..."
          />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <RealtimeSettings />

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 items-center rounded-full bg-slate-900 px-1.5 text-[10px] font-medium text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void refresh();
                }}
                disabled={loading}
                aria-label="Refresh notifications"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    void markAllRead();
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter tabs + connection status */}
          <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/50 px-4 py-2">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All${notifications.length ? ` · ${notifications.length}` : ""}`}
            />
            <FilterPill
              active={filter === "unread"}
              onClick={() => setFilter("unread")}
              label={`Unread${unreadCount ? ` · ${unreadCount}` : ""}`}
            />
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              <Radio className={cn("h-3 w-3", connected ? "text-emerald-500" : "text-amber-500")} />
              {connected ? "Live" : "Reconnecting"}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[26rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <NotificationListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState filter={filter} hasAny={notifications.length > 0} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((n) => (
                  <NotificationRow
                    key={n.notificationId}
                    item={n}
                    onClick={() => handleItemClick(n as NotificationItem)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-2">
            <span className="text-[11px] text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread of ${notifications.length}`
                : `${notifications.length} total`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
      )}
    >
      {label}
    </button>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const visual = visualForType(item.type);
  const Icon = visual.Icon;
  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={cn(
          "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none",
          !item.read && "bg-blue-50/30",
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ring-inset",
            visual.bgClass,
            visual.ringClass,
          )}
        >
          <Icon className={cn("h-4 w-4", visual.color)} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-sm",
                item.read
                  ? "font-medium text-slate-500"
                  : "font-semibold text-slate-900",
              )}
            >
              {item.title}
            </p>
            <span className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400">
              {formatRelative(item.createdAt)}
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-slate-500">{item.body}</p>
          {item.claimNumber && (
            <span className="mt-1 text-[10px] text-slate-400">{item.claimNumber}</span>
          )}
        </div>
        {!item.read && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
        )}
      </button>
    </li>
  );
}

function NotificationListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-2 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filter, hasAny }: { filter: Filter; hasAny: boolean }) {
  if (filter === "unread" || hasAny) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-slate-500">No unread notifications.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Inbox className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">No notifications yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Activity from claims, payments, and requests will show up here.
        </p>
      </div>
    </div>
  );
}
