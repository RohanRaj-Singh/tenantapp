// ── Generic POST helper ───────────────────────────────────────────────────────

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Campaign Actions ──────────────────────────────────────────────────────────

/**
 * Create a new campaign in "draft" status.
 * POST /api/campaigns
 */
export async function createCampaign(
  _tenantId: string,
  data: { name: string; scheduledFor?: string },
) {
  return apiPost("/api/campaigns", data);
}

/**
 * Add employees to a campaign as pending invitations.
 * POST /api/invitations/add-to-campaign
 */
export async function addInvitationsToCampaign(
  campaignId: string,
  employees: Array<{
    employeeId: string;
    employeeCode: string;
    email: string;
  }>,
): Promise<{ created: number; skipped: number }> {
  return apiPost<{ created: number; skipped: number }>(
    "/api/invitations/add-to-campaign",
    { campaignId, employees },
  );
}

// ── Single-Invitation Actions ─────────────────────────────────────────────────

/**
 * Send a single invitation.
 * POST /api/invitations/:id/send
 */
export async function sendInvitation(invitationId: string) {
  return apiPost(`/api/invitations/${invitationId}/send`, {});
}

/**
 * Resend a single invitation (regenerates token).
 * POST /api/invitations/:id/resend
 */
export async function resendInvitation(invitationId: string) {
  return apiPost(`/api/invitations/${invitationId}/resend`, {});
}

/**
 * Cancel a single invitation.
 * POST /api/invitations/:id/cancel
 */
export async function cancelInvitation(invitationId: string) {
  return apiPost(`/api/invitations/${invitationId}/cancel`, {});
}

// ── CSV Import Actions ─────────────────────────────────────────────────────────

/** Result returned by the CSV upload validation endpoint. */
export interface CsvImportValidationResult {
  total: number;
  valid: number;
  errors: number;
  rows: Array<{
    row: number;
    employeeCode: string;
    email: string;
    errors: string[];
    valid: boolean;
  }>;
}

/**
 * Upload a CSV file for validation.
 * POST /api/invitations/upload
 * Content-Type: multipart/form-data
 */
export async function uploadCsv(
  _tenantId: string,
  file: File,
): Promise<CsvImportValidationResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/invitations/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed." }));
    throw new Error(err.error);
  }
  return res.json();
}

/**
 * Confirm import of validated CSV rows.
 * POST /api/invitations/import/confirm
 */
export async function confirmCsvImport(
  _tenantId: string,
  rows: Array<{ employeeCode: string; email: string }>,
): Promise<{ created: number; campaignId: string }> {
  return apiPost<{ created: number; campaignId: string }>(
    "/api/invitations/import/confirm",
    { rows },
  );
}

/**
 * Get the URL for downloading the CSV import template.
 */
export function getImportTemplateUrl(): string {
  return "/api/invitations/upload/template";
}

// ── Bulk Actions ──────────────────────────────────────────────────────────────

/**
 * Send multiple invitations at once.
 * POST /api/invitations/bulk-send
 */
export async function sendBulkInvitations(
  invitationIds: string[],
): Promise<{ sent: number; failed: number }> {
  return apiPost<{ sent: number; failed: number }>(
    "/api/invitations/bulk-send",
    { invitationIds },
  );
}

/**
 * Cancel multiple invitations at once.
 * POST /api/invitations/bulk-cancel
 */
export async function cancelBulkInvitations(
  invitationIds: string[],
): Promise<{ cancelled: number }> {
  return apiPost<{ cancelled: number }>(
    "/api/invitations/bulk-cancel",
    { invitationIds },
  );
}
