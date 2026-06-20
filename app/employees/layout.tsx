import type { ReactNode } from "react";
import { TenantProtectedSurface } from "@/src/modules/tenant-auth/components/TenantProtectedSurface";

export default function EmployeesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantProtectedSurface nextPath="/employees">
      {children}
    </TenantProtectedSurface>
  );
}
