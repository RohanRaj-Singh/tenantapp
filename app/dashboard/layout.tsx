import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <TenantProtectedSurface nextPath="/dashboard">{children}</TenantProtectedSurface>;
}
