import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { EmployeeDocument } from "@/src/server/db/documents";
import { createCampaign, addInvitationsToCampaign } from "@/src/server/services/invitationService";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CsvRow {
  employeeCode: string;
  email: string;
}

export interface CsvImportValidationRow {
  row: number;
  employeeCode: string;
  email: string;
  errors: string[];
  valid: boolean;
}

export interface CsvImportValidationResult {
  total: number;
  valid: number;
  errors: number;
  rows: CsvImportValidationRow[];
}

// ── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse raw CSV text into an array of CsvRow objects.
 *
 * Expects a header row: `employeeCode,email` (case-insensitive).
 * If the first row contains "employeeCode" or "code" it is treated as a header
 * and skipped. Each subsequent non-empty line is parsed as `employeeCode,email`.
 */
export function parseCsvContent(csvContent: string): CsvRow[] {
  if (!csvContent || csvContent.trim().length === 0) {
    throw new Error("CSV content is empty.");
  }

  const lines = csvContent.split(/\r?\n/);
  const rows: CsvRow[] = [];

  let startIndex = 0;

  // Detect and skip header row
  if (lines.length > 0) {
    const firstLine = lines[0].trim().toLowerCase();
    if (firstLine.includes("employeecode") || firstLine.includes("code")) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) {
      continue; // skip blank lines
    }

    const parts = line.split(",");
    const employeeCode = (parts[0] ?? "").trim();
    const email = (parts[1] ?? "").trim();

    rows.push({ employeeCode, email });
  }

  if (rows.length === 0) {
    throw new Error("No valid data rows found in CSV.");
  }

  return rows;
}

// ── XLSX Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse an XLSX workbook buffer into an array of CsvRow objects.
 *
 * Reads the first sheet. Expects header row: employeeCode, email (case-insensitive).
 * If the first row contains "employeeCode" or "code" it is treated as a header
 * and skipped.
 */
export function parseXlsxContent(buffer: ArrayBuffer): CsvRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error("XLSX file contains no sheets.");
  }

  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

  if (json.length === 0) {
    throw new Error("No data rows found in XLSX file.");
  }

  // Detect header row from the first object's keys
  const headers = Object.keys(json[0] ?? {});
  const hasCodeCol = headers.some((h) => h.toLowerCase().includes("code") || h.toLowerCase().includes("employee"));
  const hasEmailCol = headers.some((h) => h.toLowerCase().includes("email"));

  if (!hasCodeCol || !hasEmailCol) {
    throw new Error(
      "XLSX file must contain 'employeeCode' and 'email' columns.",
    );
  }

  // Find the actual column keys (they may vary: "Employee Code", "employee_code", etc.)
  const codeKey = headers.find((h) => h.toLowerCase().includes("code") || h.toLowerCase().includes("employee"))!;
  const emailKey = headers.find((h) => h.toLowerCase().includes("email"))!;

  const rows: CsvRow[] = [];
  for (const row of json) {
    const employeeCode = (row[codeKey] ?? "").toString().trim();
    const email = (row[emailKey] ?? "").toString().trim();
    if (!employeeCode && !email) continue; // skip fully empty rows
    rows.push({ employeeCode, email });
  }

  if (rows.length === 0) {
    throw new Error("No valid data rows found in XLSX file.");
  }

  return rows;
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate CSV rows against format rules, duplicate detection, and
 * existing-data checks in the tenant.
 *
 * For each row, the following checks are performed in order:
 *   1. employeeCode format (required, alphanumeric + hyphens/underscores)
 *   2. email format (required, basic email pattern)
 *   3. Duplicate employeeCode within the file
 *   4. Duplicate email within the file
 *   5. Existing employeeCode in the tenant
 *   6. Existing email in the tenant
 *
 * Database queries are deduplicated so each unique code/email is fetched
 * only once, regardless of how many rows share it.
 */
export async function validateCsvRows(
  tenantId: string,
  rows: CsvRow[],
): Promise<CsvImportValidationResult> {
  const repositories = await getRepositoryContext();

  // ── Step 1: Count occurrences for duplicate detection ──────────────────
  const codeFrequencies = new Map<string, number>();
  const emailFrequencies = new Map<string, number>();

  for (const row of rows) {
    const normalisedEmail = row.email.toLowerCase().trim();
    codeFrequencies.set(row.employeeCode, (codeFrequencies.get(row.employeeCode) ?? 0) + 1);
    emailFrequencies.set(normalisedEmail, (emailFrequencies.get(normalisedEmail) ?? 0) + 1);
  }

  // ── Step 2: Batch-check existing codes and emails in the tenant ─────────
  const uniqueCodes = [...new Set(rows.map((r) => r.employeeCode))];
  const uniqueEmails = [...new Set(rows.map((r) => r.email.toLowerCase().trim()))];

  const [existingCodeDocs, existingEmailDocs] = await Promise.all([
    Promise.all(
      uniqueCodes.map((code) => repositories.employees.findByEmployeeCode(tenantId, code)),
    ),
    Promise.all(
      uniqueEmails.map((email) => repositories.employees.findByTenantAndEmail(tenantId, email)),
    ),
  ]);

  const existingCodes = new Set<string>();
  const existingEmails = new Set<string>();

  for (let i = 0; i < uniqueCodes.length; i++) {
    if (existingCodeDocs[i]) {
      existingCodes.add(uniqueCodes[i]);
    }
  }
  for (let i = 0; i < uniqueEmails.length; i++) {
    if (existingEmailDocs[i]) {
      existingEmails.add(uniqueEmails[i]);
    }
  }

  // ── Step 3: Validate each row ───────────────────────────────────────────
  const validationRows: CsvImportValidationRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normalisedEmail = row.email.toLowerCase().trim();
    const errors: string[] = [];

    // 1. employeeCode format
    if (!row.employeeCode || row.employeeCode.length === 0) {
      errors.push("Invalid employee code format.");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(row.employeeCode)) {
      errors.push("Invalid employee code format.");
    }

    // 2. email format
    if (!row.email || row.email.length === 0) {
      errors.push("Invalid email format.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push("Invalid email format.");
    }

    // 3. Duplicate employeeCode in file
    if ((codeFrequencies.get(row.employeeCode) ?? 0) > 1) {
      errors.push("Duplicate employee code in file.");
    }

    // 4. Duplicate email in file
    if ((emailFrequencies.get(normalisedEmail) ?? 0) > 1) {
      errors.push("Duplicate email in file.");
    }

    // 5. Existing employeeCode in tenant
    if (existingCodes.has(row.employeeCode)) {
      errors.push("Employee code already exists.");
    }

    // 6. Existing email in tenant
    if (existingEmails.has(normalisedEmail)) {
      errors.push("Email already in use.");
    }

    validationRows.push({
      row: i + 1, // 1-indexed for readability
      employeeCode: row.employeeCode,
      email: row.email,
      errors,
      valid: errors.length === 0,
    });
  }

  const validCount = validationRows.filter((r) => r.valid).length;
  const errorCount = validationRows.filter((r) => !r.valid).length;

  return {
    total: rows.length,
    valid: validCount,
    errors: errorCount,
    rows: validationRows,
  };
}

// ── Import Confirmation ──────────────────────────────────────────────────────

/**
 * Confirm a CSV import by creating EmployeeDocument records for every row
 * and bundling them into a new invitation campaign.
 *
 * Each employee is created with status `not_registered` (no name, no password),
 * matching the pattern used by `employeeService.createEmployee()`. A campaign
 * named after the current date (e.g. "CSV Import - Jul 19, 2026") is created,
 * and all imported employees are added as pending invitations to that campaign.
 */
export async function confirmCsvImport(
  tenantId: string,
  rows: CsvRow[],
  createdBy: string,
): Promise<{ created: number; campaignId: string }> {
  const now = new Date().toISOString();
  const repositories = await getRepositoryContext();

  // ── 1. Create employee documents ────────────────────────────────────────
  const employees: EmployeeDocument[] = [];

  for (const row of rows) {
    const employee: EmployeeDocument = {
      employeeId: `emp_${randomUUID()}`,
      tenantId,
      employeeCode: row.employeeCode.trim(),
      name: null,
      email: row.email.toLowerCase().trim(),
      status: "not_registered",
      passwordHash: null,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastAccessAt: null,
      createdAt: now,
      updatedAt: now,
    };

    employees.push(employee);
  }

  // ── 2. Insert all employees ─────────────────────────────────────────────
  for (const emp of employees) {
    await repositories.employees.insert(emp);
  }

  // ── 3. Create a campaign named after today's date ───────────────────────
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const campaignName = `CSV Import - ${dateStr}`;

  const campaign = await createCampaign(tenantId, {
    name: campaignName,
    createdBy,
  });

  // ── 4. Add all imported employees as invitations to the campaign ────────
  const invitationResult = await addInvitationsToCampaign(
    campaign.campaignId,
    employees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      email: emp.email,
    })),
  );

  if (!invitationResult.success) {
    throw new Error(
      `Failed to add invitations to campaign: ${invitationResult.error}`,
    );
  }

  return {
    created: employees.length,
    campaignId: campaign.campaignId,
  };
}
