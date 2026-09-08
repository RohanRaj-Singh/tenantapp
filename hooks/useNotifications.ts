'use client';

import { useRealtime } from '@/components/realtime/RealtimeProvider';

export function useNotifications() {
  const { unreadCount, notifications, markRead, markAllRead, connected } = useRealtime();
  return { unreadCount, notifications, markRead, markAllRead, connected };
}
