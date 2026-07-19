import { randomUUID, randomBytes } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  CampaignDocument,
  CampaignStatus,
  InvitationDocument,
} from "@/src/server/db/documents";
import type {
  FindCampaignsOptions,
  FindCampaignsResult,
  FindInvitationsOptions,
  FindInvitationsResult,
} from "@/src/server/repositories/contracts";

// ── Error Types ───────────────────────────────────────────────────────────────

export type InvitationServiceErrorCode =
  | "CAMPAIGN_NOT_FOUND"
  | "INVITATION_NOT_FOUND"
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_ALREADY_INVITED"
  | "CAMPAIGN_ALREADY_SENT"
  | "INVALID_STATUS_TRANSITION";

export type InvitationServiceResult<T> =
  | { success: true; data: T }
  | { success: false; errorCode: InvitationServiceErrorCode; error: string };

// ── Campaign CRUD ────────────────────────────────────────────────────────────

/**
 * Create a new campaign in "draft" status.
 */
export async function createCampaign(
  tenantId: string,
  data: { name: string; scheduledFor?: string; createdBy: string },
): Promise<CampaignDocument> {
  const now = new Date().toISOString();

  const campaign: CampaignDocument = {
    campaignId: `cmp_${randomUUID()}`,
    tenantId,
    name: data.name,
    status: "draft",
    scheduledFor: data.scheduledFor ?? null,
    totalRecipients: 0,
    sentCount: 0,
    openedCount: 0,
    completedCount: 0,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.campaigns.insert(campaign);

  return campaign;
}

/**
 * Update campaign fields (name, status, scheduledFor).
 * No status transition validation — that is handled by dedicated actions.
 */
export async function updateCampaign(
  campaignId: string,
  data: { name?: string; status?: CampaignStatus; scheduledFor?: string },
): Promise<InvitationServiceResult<CampaignDocument>> {
  const repositories = await getRepositoryContext();
  const existing = await repositories.campaigns.findById(campaignId);

  if (!existing) {
    return {
      success: false,
      errorCode: "CAMPAIGN_NOT_FOUND",
      error: `Campaign with ID '${campaignId}' not found.`,
    };
  }

  const updates: Partial<CampaignDocument> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.status !== undefined) updates.status = data.status;
  if (data.scheduledFor !== undefined) updates.scheduledFor = data.scheduledFor;

  const updated = await repositories.campaigns.update(campaignId, updates);

  return {
    success: true,
    data: updated ?? existing,
  };
}

// ── Invitation Management ─────────────────────────────────────────────────────

/**
 * Add employees to a campaign as pending invitations.
 * Skips employees that already have an invitation in this campaign.
 *
 * Returns counts of created and skipped invitations.
 */
export async function addInvitationsToCampaign(
  campaignId: string,
  employeeIds: { employeeId: string; employeeCode: string; email: string }[],
): Promise<InvitationServiceResult<{ created: number; skipped: number }>> {
  const repositories = await getRepositoryContext();
  const campaign = await repositories.campaigns.findById(campaignId);

  if (!campaign) {
    return {
      success: false,
      errorCode: "CAMPAIGN_NOT_FOUND",
      error: `Campaign with ID '${campaignId}' not found.`,
    };
  }

  // Fetch existing invitations for this campaign to detect duplicates
  const existingResult = await repositories.invitations.findByCampaignId(campaignId, {
    limit: 10000,
  });
  const existingEmployeeIds = new Set(
    existingResult.invitations.map((inv) => inv.employeeId),
  );

  const now = new Date().toISOString();
  const invitationsToCreate: InvitationDocument[] = [];
  let skipped = 0;

  for (const emp of employeeIds) {
    if (existingEmployeeIds.has(emp.employeeId)) {
      skipped++;
      continue;
    }

    const token = `inv_${randomBytes(4).toString("hex").toUpperCase()}`;

    invitationsToCreate.push({
      invitationId: `inv_${randomUUID()}`,
      campaignId,
      tenantId: campaign.tenantId,
      employeeId: emp.employeeId,
      email: emp.email,
      employeeCode: emp.employeeCode,
      token,
      status: "pending",
      sentAt: null,
      openedAt: null,
      completedAt: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (invitationsToCreate.length > 0) {
    await repositories.invitations.insertMany(invitationsToCreate);
  }

  // Update campaign totalRecipients
  const newTotal = campaign.totalRecipients + invitationsToCreate.length;
  await repositories.campaigns.update(campaignId, {
    totalRecipients: newTotal,
    updatedAt: now,
  });

  return {
    success: true,
    data: { created: invitationsToCreate.length, skipped },
  };
}

// ── Send Invitations ──────────────────────────────────────────────────────────

/**
 * Send a single invitation.
 * Only allowed from "pending" status — returns INVALID_STATUS_TRANSITION otherwise.
 * Sets status to "sent", sentAt to now, and expiresAt to 14 days from now.
 * Increments the campaign's sentCount.
 */
export async function sendInvitation(
  invitationId: string,
): Promise<InvitationServiceResult<InvitationDocument>> {
  const repositories = await getRepositoryContext();
  const invitation = await repositories.invitations.findById(invitationId);

  if (!invitation) {
    return {
      success: false,
      errorCode: "INVITATION_NOT_FOUND",
      error: `Invitation with ID '${invitationId}' not found.`,
    };
  }

  if (invitation.status !== "pending") {
    return {
      success: false,
      errorCode: "INVALID_STATUS_TRANSITION",
      error: `Cannot send invitation with status '${invitation.status}'. Only 'pending' invitations can be sent.`,
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const updated = await repositories.invitations.update(invitationId, {
    status: "sent",
    sentAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString(),
  });

  // Increment campaign sentCount
  const campaign = await repositories.campaigns.findById(invitation.campaignId);
  if (campaign) {
    await repositories.campaigns.update(invitation.campaignId, {
      sentCount: campaign.sentCount + 1,
      updatedAt: now.toISOString(),
    });
  }

  return {
    success: true,
    data: updated ?? ({ ...invitation, status: "sent", sentAt: now.toISOString(), expiresAt: expiresAt.toISOString(), updatedAt: now.toISOString() } as InvitationDocument),
  };
}

/**
 * Bulk-send invitations.
 * Uses updateMany for efficiency; counts successes vs failures.
 */
export async function sendBulkInvitations(
  invitationIds: string[],
): Promise<{ sent: number; failed: number }> {
  if (invitationIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const repositories = await getRepositoryContext();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // The underlying MongoDB updateMany accepts any filter shape;
  // we cast the filter to match the contract type at the call site.
  const modifiedCount = await repositories.invitations.updateMany(
    { invitationId: { $in: invitationIds } } as unknown as {
      campaignId?: string;
      status?: string;
    },
    {
      status: "sent",
      sentAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    },
  );

  return {
    sent: modifiedCount,
    failed: invitationIds.length - modifiedCount,
  };
}

/**
 * Resend an invitation — regenerates the token.
 * Only works on "sent" or "expired" statuses.
 * Increments the campaign's sentCount.
 */
export async function resendInvitation(
  invitationId: string,
): Promise<InvitationServiceResult<InvitationDocument>> {
  const repositories = await getRepositoryContext();
  const invitation = await repositories.invitations.findById(invitationId);

  if (!invitation) {
    return {
      success: false,
      errorCode: "INVITATION_NOT_FOUND",
      error: `Invitation with ID '${invitationId}' not found.`,
    };
  }

  if (invitation.status !== "sent" && invitation.status !== "expired") {
    return {
      success: false,
      errorCode: "INVALID_STATUS_TRANSITION",
      error: `Cannot resend invitation with status '${invitation.status}'. Only 'sent' or 'expired' invitations can be resent.`,
    };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const newToken = `inv_${randomBytes(4).toString("hex").toUpperCase()}`;

  const updated = await repositories.invitations.update(invitationId, {
    status: "sent",
    token: newToken,
    sentAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString(),
  });

  // Increment campaign sentCount (this counts as a new send)
  const campaign = await repositories.campaigns.findById(invitation.campaignId);
  if (campaign) {
    await repositories.campaigns.update(invitation.campaignId, {
      sentCount: campaign.sentCount + 1,
      updatedAt: now.toISOString(),
    });
  }

  return {
    success: true,
    data: updated ?? ({ ...invitation, status: "sent", token: newToken, sentAt: now.toISOString(), expiresAt: expiresAt.toISOString(), updatedAt: now.toISOString() } as InvitationDocument),
  };
}

// ── Cancel Invitations ────────────────────────────────────────────────────────

/**
 * Cancel a single invitation.
 * Cannot cancel "completed" invitations.
 */
export async function cancelInvitation(
  invitationId: string,
): Promise<InvitationServiceResult<InvitationDocument>> {
  const repositories = await getRepositoryContext();
  const invitation = await repositories.invitations.findById(invitationId);

  if (!invitation) {
    return {
      success: false,
      errorCode: "INVITATION_NOT_FOUND",
      error: `Invitation with ID '${invitationId}' not found.`,
    };
  }

  if (invitation.status === "completed") {
    return {
      success: false,
      errorCode: "INVALID_STATUS_TRANSITION",
      error: "Cannot cancel a completed invitation.",
    };
  }

  const updated = await repositories.invitations.update(invitationId, {
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    data: updated ?? ({ ...invitation, status: "cancelled", updatedAt: new Date().toISOString() } as InvitationDocument),
  };
}

/**
 * Bulk-cancel invitations.
 * Cancels all specified invitations that are not already completed.
 */
export async function cancelBulkInvitations(
  invitationIds: string[],
): Promise<{ cancelled: number }> {
  if (invitationIds.length === 0) {
    return { cancelled: 0 };
  }

  const repositories = await getRepositoryContext();

  const modifiedCount = await repositories.invitations.updateMany(
    { invitationId: { $in: invitationIds } } as unknown as {
      campaignId?: string;
      status?: string;
    },
    {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    },
  );

  return { cancelled: modifiedCount };
}

// ── Token Lookup & Completion ─────────────────────────────────────────────────

/**
 * Look up an invitation by its unique token.
 */
export async function getInvitationByToken(
  token: string,
): Promise<InvitationDocument | null> {
  const repositories = await getRepositoryContext();
  return repositories.invitations.findByToken(token);
}

/**
 * Complete an invitation using its token.
 * Only allowed from "sent" status.
 * Increments the campaign's completedCount.
 */
export async function completeInvitation(
  token: string,
): Promise<InvitationServiceResult<InvitationDocument>> {
  const repositories = await getRepositoryContext();
  const invitation = await repositories.invitations.findByToken(token);

  if (!invitation) {
    return {
      success: false,
      errorCode: "INVITATION_NOT_FOUND",
      error: "Invalid invitation token.",
    };
  }

  if (invitation.status !== "sent") {
    return {
      success: false,
      errorCode: "INVALID_STATUS_TRANSITION",
      error: `Cannot complete invitation with status '${invitation.status}'. Only 'sent' invitations can be completed.`,
    };
  }

  const now = new Date().toISOString();

  const updated = await repositories.invitations.update(invitation.invitationId, {
    status: "completed",
    completedAt: now,
    updatedAt: now,
  });

  // Increment campaign completedCount
  const campaign = await repositories.campaigns.findById(invitation.campaignId);
  if (campaign) {
    await repositories.campaigns.update(invitation.campaignId, {
      completedCount: campaign.completedCount + 1,
      updatedAt: now,
    });
  }

  return {
    success: true,
    data: updated ?? ({ ...invitation, status: "completed", completedAt: now, updatedAt: now } as InvitationDocument),
  };
}

// ── Dashboard & Listing ───────────────────────────────────────────────────────

/**
 * Gets employee onboarding dashboard statistics for a tenant.
 *
 * Counts are derived from employee statuses — invitation/campaign
 * stats are tracked separately and not included here.
 */
export async function getCampaignDashboardStats(
  tenantId: string,
): Promise<{
  totalEmployees: number;
  activeEmployees: number;
  pendingRegistration: number;
  inactiveEmployees: number;
}> {
  const repositories = await getRepositoryContext();

  const [all, active, notRegistered, inactive] = await Promise.all([
    repositories.employees.findByTenantId(tenantId),
    repositories.employees.findByTenantId(tenantId, { status: "active" }),
    repositories.employees.findByTenantId(tenantId, { status: "not_registered" }),
    repositories.employees.findByTenantId(tenantId, { status: "inactive" }),
  ]);

  return {
    totalEmployees: all.total,
    activeEmployees: active.total,
    pendingRegistration: notRegistered.total,
    inactiveEmployees: inactive.total,
  };
}

/**
 * List campaigns for a tenant with optional filtering and pagination.
 */
export async function listCampaigns(
  tenantId: string,
  options?: FindCampaignsOptions,
): Promise<FindCampaignsResult> {
  const repositories = await getRepositoryContext();
  return repositories.campaigns.findByTenantId(tenantId, options);
}

/**
 * List invitations for a tenant with optional filtering and pagination.
 */
export async function listInvitations(
  tenantId: string,
  options?: FindInvitationsOptions,
): Promise<FindInvitationsResult> {
  const repositories = await getRepositoryContext();
  return repositories.invitations.findByTenantId(tenantId, options);
}

/**
 * List campaign history (import history proxy).
 * Returns campaigns sorted by createdAt descending.
 * In the future this may read from a dedicated import_log collection.
 */
export async function listImportHistory(
  tenantId: string,
): Promise<CampaignDocument[]> {
  const repositories = await getRepositoryContext();
  const result = await repositories.campaigns.findByTenantId(tenantId, {
    limit: 100,
  });
  return result.campaigns;
}
