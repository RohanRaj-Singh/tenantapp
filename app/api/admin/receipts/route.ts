import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes super admin receipt access.
 * Requires the shared admin API key.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err: Error) => controller.error(err));
    },
  });
}

export async function GET(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const reimbursementId = searchParams.get("reimbursementId");

    if (!reimbursementId) {
      return NextResponse.json(
        { error: "reimbursementId is required." },
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
    return NextResponse.json(
      { error: "Failed to retrieve receipt." },
      { status: 500 },
    );
  }
}
