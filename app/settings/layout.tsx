import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <TenantProtectedSurface nextPath="/settings">{children}</TenantProtectedSurface>;
}
