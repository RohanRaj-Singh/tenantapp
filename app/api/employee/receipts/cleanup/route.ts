import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * DELETE /api/employee/receipts/cleanup
 *
 * Deletes an orphaned receipt file from disk.
 * Called by the marketing site when a receipt upload succeeded
 * but the subsequent claim creation failed.
 *
 * Body: { receiptUrl: string }
 */
export async function DELETE(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { receiptUrl } = body;

    if (!receiptUrl || typeof receiptUrl !== "string") {
      return NextResponse.json(
        { error: "receiptUrl is required." },
        { status: 400 },
      );
    }

    // Safety: only allow deletion of files within the uploads directory
    const normalizedPath = path.normalize(receiptUrl);
    if (!normalizedPath.startsWith("/uploads/receipts/")) {
      return NextResponse.json(
        { error: "Invalid receipt path." },
        { status: 400 },
      );
    }

    const filePath = path.join(process.cwd(), "public", normalizedPath);

    if (!existsSync(filePath)) {
      // File already gone — nothing to clean up
      return NextResponse.json({ success: true, deleted: false }, { status: 200 });
    }

    await unlink(filePath);

    return NextResponse.json({ success: true, deleted: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to clean up receipt." },
      { status: 500 },
    );
  }
}
