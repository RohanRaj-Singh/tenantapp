import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function ReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantProtectedSurface nextPath="/reports">
      {children}
    </TenantProtectedSurface>
  );
}
