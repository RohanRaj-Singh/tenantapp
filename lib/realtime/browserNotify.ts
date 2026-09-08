'use client';

export type BrowserNotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function getBrowserNotifyPermission(): BrowserNotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as BrowserNotifyPermission;
}

export async function requestBrowserNotifyPermission(): Promise<BrowserNotifyPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotifyPermission;
  } catch {
    return 'denied';
  }
}

export interface BrowserNotifyOptions {
  body?: string;
  tag?: string;
  href?: string;
  icon?: string;
}

export function sendBrowserNotification(title: string, options: BrowserNotifyOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    const n = new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon,
    });
    if (options.href) {
      n.onclick = () => {
        window.focus();
        window.location.assign(options.href!);
        n.close();
      };
    }
  } catch {
    // Some browsers throw if Notification is called from a non-user-gesture context.
  }
}
