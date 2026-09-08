"use client";

import { useEffect } from "react";
import { setTabTitleBase } from "@/lib/realtime/tabTitle";
import { useTheme } from "@/runtime/theme/useTheme";

/**
 * Keeps the browser tab title showing the resolved (and localized) tenant
 * name, matching what the header brand displays. The unread notification
 * count is layered on top of this base title by the shared tab-title store
 * (see lib/realtime/tabTitle.ts) — never write document.title directly here.
 */
export default function TenantTabTitle() {
  const theme = useTheme();

  useEffect(() => {
    setTabTitleBase(theme.tenantName);
  }, [theme.tenantName]);

  return null;
}