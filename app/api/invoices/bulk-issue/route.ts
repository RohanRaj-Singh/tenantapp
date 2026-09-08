import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { bulkIssueInvoices } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bulk-issue invoices (super admin only).
 *
 * Every invoice is issued through the SAME `issueInvoice` service function as
 * the single-invoice workflow, so per-item state validation (draft → issued)
 * is identical and can never be bypassed by a bulk call. One invalid invoice
 * never blocks the others; each failure is reported individually.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { invoiceIds?: unknown };
    const invoiceIds = Array.isArray(body.invoiceIds)
      ? body.invoiceIds.filter((id): id is string => typeof id === "string")
      : [];
    if (invoiceIds.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_SELECTION",
            message: "invoiceIds must be a non-empty array of invoice ids.",
          },
        },
        { status: 400 },
      );
    }

    const result = await bulkIssueInvoices(invoiceIds, "super-admin");
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}