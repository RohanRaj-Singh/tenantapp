import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { apiErrorResponse } from "@/src/server/api/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes receipt upload requests.
 * Requires a valid x-admin-api-key header matching ADMIN_API_KEY env var.
 * This ensures only trusted server-side callers (marketing site) can upload.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/** Allowed MIME types for uploaded receipts. */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

/** Allowed file extensions (lowercase). */
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

/** Maximum file size: 10 MB. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Upload directory relative to project root. */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "receipts");

function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

export async function POST(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Receipt file is required." },
        { status: 400 },
      );
    }

    // Validate file type by extension and MIME
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: "Receipt must be a PDF, JPG, or PNG file.",
          allowedFormats: ["PDF", "JPG", "JPEG", "PNG"],
        },
        { status: 400 },
      );
    }

    // Also check MIME type as secondary validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Receipt must be a PDF, JPG, or PNG file.",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Receipt file must be 10 MB or smaller.",
        },
        { status: 400 },
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Read file bytes and write to disk
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, bytes);

    const hash = createHash("sha256").update(bytes).digest("hex");
    const url = `/uploads/receipts/${uniqueName}`;

    return NextResponse.json({ url, hash }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
