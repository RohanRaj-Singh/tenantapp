'use client';

/**
 * Single-writer tab-title store.
 *
 * The browser tab title is composed from two independent sources:
 *  - the base title (the resolved, localized tenant name), pushed in by
 *    `TenantTabTitle` once the runtime branding config is known;
 *  - the unread notification count, pushed in by `RealtimeProvider`.
 *
 * Both call the setters below; the store owns `document.title` exclusively
 * so the "(N)" prefix and the tenant name can never fight or stack.
 */

const MAX_UNREAD_DISPLAYED = 99;
/** Matches one or more stacked "(N)" / "(N+)" prefixes (the old bug stacked them). */
const UNREAD_PREFIX_PATTERN = /^(?:\(\d+\+?\)\s*)+/;

/** Remove any existing "(N)" / "(N+)" unread prefixes from a tab title. */
export function stripUnreadPrefix(title: string): string {
  return title.replace(UNREAD_PREFIX_PATTERN, '');
}

export function withUnreadPrefix(count: number, originalTitle: string): string {
  // Always strip any existing prefix first so repeated applications are
  // idempotent — "(9) (8) Page" can never accumulate.
  const base = stripUnreadPrefix(originalTitle);
  if (!count || count <= 0) return base;
  const shown = count > MAX_UNREAD_DISPLAYED ? `${MAX_UNREAD_DISPLAYED}+` : String(count);
  return `(${shown}) ${base}`;
}

/** Pure composition used by the store — unit-testable without a DOM. */
export function composeTabTitle(baseTitle: string, unreadCount: number): string {
  return withUnreadPrefix(unreadCount, baseTitle);
}

// --- store ------------------------------------------------------------------

let baseTitle = '';
let unreadCount = 0;
let lastApplied = '';

function applyTabTitle(): void {
  if (typeof document === 'undefined') return;
  // Wait until a real base title is known — never write a bare "(N) " prefix
  // (and never blank the title while the tenant config is still loading).
  if (!baseTitle) return;
  const next = composeTabTitle(baseTitle, unreadCount);
  if (next !== lastApplied) {
    document.title = next;
    lastApplied = next;
  }
}

/**
 * Set the base tab title (the tenant name). Safe to call on every render —
 * duplicate values are ignored. An empty value freezes the current title
 * until a real base title arrives.
 */
export function setTabTitleBase(title: string): void {
  const clean = (title ?? '').trim();
  if (clean === baseTitle) return;
  baseTitle = clean;
  applyTabTitle();
}

/**
 * Set the unread notification count rendered as a "(N)" / "(N+)" prefix.
 * Safe to call on every render — duplicate values are ignored.
 */
export function setTabTitleUnread(count: number): void {
  const normalized = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (normalized === unreadCount) return;
  unreadCount = normalized;
  applyTabTitle();
}
