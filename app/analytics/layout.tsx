import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantProtectedSurface nextPath="/analytics">
      {children}
    </TenantProtectedSurface>
  );
}
