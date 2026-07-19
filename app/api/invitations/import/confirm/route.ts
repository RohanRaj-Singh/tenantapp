import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { confirmCsvImport } from "@/src/server/services/csvImportService";
import type { CsvRow } from "@/src/server/services/csvImportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as { rows?: unknown };

    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "Rows array is required and must contain at least one entry." },
        { status: 400 },
      );
    }

    const rows: CsvRow[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const item = body.rows[i];

      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { error: `Row at index ${i} is invalid.` },
          { status: 400 },
        );
      }

      const row = item as Record<string, unknown>;

      if (typeof row.employeeCode !== "string" || row.employeeCode.trim().length === 0) {
        return NextResponse.json(
          { error: `Row at index ${i} is missing a valid employeeCode.` },
          { status: 400 },
        );
      }

      if (typeof row.email !== "string" || row.email.trim().length === 0) {
        return NextResponse.json(
          { error: `Row at index ${i} is missing a valid email.` },
          { status: 400 },
        );
      }

      rows.push({
        employeeCode: row.employeeCode.trim(),
        email: row.email.trim(),
      });
    }

    const result = await confirmCsvImport(
      auth.context.tenant.tenantId,
      rows,
      auth.context.user.id,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
