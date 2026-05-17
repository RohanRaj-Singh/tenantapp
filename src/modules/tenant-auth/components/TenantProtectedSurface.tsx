import type { ReactNode } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { getTenantRuntimeConfigForTenantId } from "../utils/request-tenant";
import { requireCurrentTenantUser } from "../utils/current-tenant-user";
import { StaticRuntimeConfigProvider } from "./StaticRuntimeConfigProvider";

interface TenantProtectedSurfaceProps {
  children: ReactNode;
  nextPath: string;
  allowPasswordChange?: boolean;
}

export async function TenantProtectedSurface({
  children,
  nextPath,
  allowPasswordChange = false,
}: TenantProtectedSurfaceProps) {
  const context = await requireCurrentTenantUser({
    allowPasswordChange,
    nextPath,
  });
  const runtimeConfig = await getTenantRuntimeConfigForTenantId(context.user.tenantId);

  if (!runtimeConfig) {
    throw new Error("Tenant dashboard runtime is unavailable.");
  }

  return (
    <StaticRuntimeConfigProvider config={runtimeConfig}>
      <DashboardShell user={context.user}>{children}</DashboardShell>
    </StaticRuntimeConfigProvider>
  );
}
