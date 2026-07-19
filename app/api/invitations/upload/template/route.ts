import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Template ──────────────────────────────────────────────────────

    const header = ["Employee Code", "Email"];
    const rows = [
      ["EMP-001", "ahmed@example.com"],
      ["EMP-002", "mariam@example.com"],
      ["EMP-003", "said@example.com"],
      ["EMP-004", "noor@example.com"],
      ["EMP-005", "fatma@example.com"],
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Column widths
    ws["!cols"] = [
      { wch: 18 }, // Employee Code
      { wch: 30 }, // Email
    ];

    // Style the header row: bold, blue background, white text
    // xlsx doesn't support native cell styles in the community version,
    // but we apply rich text formatting hints via cell metadata
    for (let col = 0; col < header.length; col++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          fill: { fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: "center" },
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // ── Sheet 2: Instructions ──────────────────────────────────────────────────

    const instructions = [
      ["Employee Import - Instructions"],
      [""],
      ["Column", "Required", "Description"],
      ["Employee Code", "Yes", "Unique identifier for the employee (letters, numbers, hyphens, underscores)"],
      ["Email", "Yes", "Employee's work email address. Must be unique per organization."],
      [""],
      ["Notes:"],
      ["- The first row contains column headers and must not be deleted."],
      ["- Employee codes must be unique within your organization."],
      ["- Emails must be unique within your organization."],
      ["- Rows with invalid data will be rejected and shown in the error preview."],
      [""],
      ["Example:"],
      ["EMP-001, ahmed@example.com"],
      ["EMP-002, mariam@example.com"],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    ws2["!cols"] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 60 },
    ];

    // Bold the title and header rows
    const boldCells = [{ r: 0, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }];
    for (const { r, c } of boldCells) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws2[ref]) {
        ws2[ref].s = { font: { bold: true, sz: r === 0 ? 14 : 11 } };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

    // ── Generate buffer ────────────────────────────────────────────────────────

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=employee-import-template.xlsx",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
