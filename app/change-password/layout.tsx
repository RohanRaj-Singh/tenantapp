import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function ChangePasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantProtectedSurface nextPath="/change-password" allowPasswordChange>
      {children}
    </TenantProtectedSurface>
  );
}
