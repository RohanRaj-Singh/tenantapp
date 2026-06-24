import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes employee-facing receipt access.
 * Requires the shared admin API key (same pattern as employee reimbursements).
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * Convert a Node.js ReadStream to a Web ReadableStream for Next.js.
 */
function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reimbursementId: string }> },
) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const { reimbursementId } = await context.params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");

    if (!tenantId || !employeeCode) {
      return NextResponse.json(
        { error: "tenantId and employeeCode are required." },
        { status: 400 },
      );
    }

    const repositories = await getRepositoryContext();
    const reimbursement = await repositories.reimbursements.findById(reimbursementId);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    // Validate tenant ownership
    if (reimbursement.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Claim not found for this tenant." },
        { status: 404 },
      );
    }

    // Validate employee ownership
    const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());
    if (!employee || reimbursement.employeeId !== employee.employeeId) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    // ── Verify employee is active ────────────────────────────────────────
    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "Employee account is not active." },
        { status: 403 },
      );
    }

    // Resolve file path
    if (!reimbursement.receiptUrl) {
      return NextResponse.json(
        { error: "No receipt attached to this claim." },
        { status: 404 },
      );
    }

    const filePath = path.join(process.cwd(), "public", reimbursement.receiptUrl);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Receipt file not found." },
        { status: 404 },
      );
    }

    // Determine content type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypeMap[ext] ?? "application/octet-stream";

    const fileStats = await stat(filePath);
    const nodeStream = createReadStream(filePath);
    const webStream = nodeStreamToWeb(nodeStream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStats.size),
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
