import { NextResponse } from "next/server";
import { requireClinicApiAuth } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import { resolveClinicParticipant } from "@/src/server/services/clinicPortalService";
import type { ChatAccessContext } from "@/src/server/services/claimMessageService";

/**
 * Resolves the claim-chat participant for a clinic portal session. The returned
 * context carries the clinic scope (`clinicIds` + `tenantIds`) so
 * `assertClaimAccess` can enforce clinic-level access in `claimMessageService`.
 */
export async function resolveClinicChatParticipant(): Promise<
  | { success: true; context: ChatAccessContext }
  | { success: false; response: NextResponse }
> {
  const auth = await requireClinicApiAuth();
  if (!auth.success) {
    return { success: false, response: auth.response };
  }

  return {
    success: true,
    context: {
      tenantId: auth.context.user.tenantIds[0] ?? "",
      participant: resolveClinicParticipant(auth.context.user),
      clinicScope: {
        clinicIds: auth.context.user.clinicIds,
        tenantIds: auth.context.user.tenantIds,
      },
    },
  };
}
