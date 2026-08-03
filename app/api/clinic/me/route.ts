import { NextResponse } from "next/server";
import { requireClinicApiAuth } from "@/src/modules/clinic-auth/middleware/clinic-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireClinicApiAuth({ allowPasswordChange: true });
  if (!auth.success) {
    return auth.response;
  }

  return NextResponse.json({
    authenticated: true,
    user: auth.context.user,
  });
}
