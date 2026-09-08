import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function RequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantProtectedSurface nextPath="/requests">
      {children}
    </TenantProtectedSurface>
  );
}
