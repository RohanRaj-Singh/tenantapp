import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resolveChatParticipant } from "../reimbursements/[id]/messages/_helpers";
import { listClaimRequestsForTenant } from "@/src/server/services/claimRequestService";
import type { ClaimRequestStatus } from "@/src/server/db/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: ClaimRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "more_info",
  "converted_to_chat",
];

/**
 * GET /api/requests
 *
 * Tenant-scoped inbox for claim "Request" documents. Only the organization
 * (tenant admin) of the caller's tenant may list — the endpoint enforces
 * tenant isolation by passing `context.tenantId` (resolved from the session)
 * into the service, so changing claimId / requestId / tenantId in the URL
 * cannot surface another tenant's data. Cross-tenant super admin access is
 * not exposed here; super admins should use the claim-scoped
 * `/api/reimbursements/[id]/requests` endpoint instead.
 *
 * Query params:
 *   status — optional filter, one of `pending|approved|rejected|more_info|converted_to_chat`
 *   limit  — optional positive integer, default 100
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveChatParticipant(request);
    if (!resolved.success) {
      return resolved.response;
    }

    const role = resolved.context.participant.role;
    if (role !== "tenantAdmin") {
      return NextResponse.json(
        {
          error: "Only the organization can access the requests inbox.",
          errorCode: "FORBIDDEN_ROLE",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status");
    const rawLimit = searchParams.get("limit");

    let status: ClaimRequestStatus | undefined;
    if (rawStatus) {
      if (!VALID_STATUSES.includes(rawStatus as ClaimRequestStatus)) {
        return NextResponse.json(
          { error: "Invalid status filter.", errorCode: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
      status = rawStatus as ClaimRequestStatus;
    }

    let limit: number | undefined;
    if (rawLimit) {
      const parsed = Number(rawLimit);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
        return NextResponse.json(
          { error: "Invalid limit.", errorCode: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
      limit = parsed;
    }

    const result = await listClaimRequestsForTenant(
      resolved.context,
      status ? { status, limit } : limit ? { limit } : undefined,
    );

    if (!result) {
      return NextResponse.json(
        { error: "Unable to load requests." },
        { status: 403 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
