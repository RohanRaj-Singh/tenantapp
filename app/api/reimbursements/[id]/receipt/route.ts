import { NextResponse } from "next/server";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { getReimbursement } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await context.params;

    // getReimbursement already validates tenantId ownership
    const reimbursement = await getReimbursement(auth.context.tenant.tenantId, id);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

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
