import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { parseCsvContent, parseXlsxContent, validateCsvRows } from "@/src/server/services/csvImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Please attach a .csv or .xlsx file." },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Invalid file type. Only .csv and .xlsx files are accepted." },
        { status: 400 },
      );
    }

    let rows;

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: "The uploaded file is empty." },
          { status: 400 },
        );
      }
      try {
        rows = parseCsvContent(text);
      } catch {
        return NextResponse.json(
          { error: "Failed to parse CSV content. Ensure the file follows the required format (employeeCode,email)." },
          { status: 400 },
        );
      }
    } else {
      const buffer = await file.arrayBuffer();
      try {
        rows = parseXlsxContent(buffer);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to parse XLSX content." },
          { status: 400 },
        );
      }
    }

    const result = await validateCsvRows(auth.context.tenant.tenantId, rows);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
