import { NextResponse } from "next/server";
import { TENANT_PASSWORD_CHANGE_PATH } from "@/src/modules/tenant-auth/guards/route-protection";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTenantApiAuth({ allowPasswordChange: true });
  if (!auth.success) {
    return auth.response;
  }

  return NextResponse.json({
    authenticated: true,
    user: auth.context.user,
    tenantStatus: auth.context.tenant.status,
    redirectTo: auth.context.user.mustChangePassword
      ? TENANT_PASSWORD_CHANGE_PATH
      : "/dashboard",
  });
}
