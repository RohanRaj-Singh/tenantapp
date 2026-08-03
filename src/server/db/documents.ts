import type {
  DashboardAggregationSnapshot,
  DashboardSnapshotFilters,
} from "@/runtime/contracts/aggregation";
import type {
  RuntimeAttributeTemplate,
  TenantContentConfig,
  RuntimeVersionRefs,
  TenantBrandingConfig,
  TenantRuntimeConfig,
} from "@/runtime/contracts/runtime";
import type {
  RuntimeScannerVersion,
  ScannerQuestion,
} from "@/runtime/contracts/scannerVersion";
import type {
  SurveySubmission,
  SurveySubmissionAttributes,
  SurveySubmissionResponse,
} from "@/runtime/contracts/surveySubmission";

export const COLLECTION_NAMES = {
  tenants: "tenants",
  runtimeConfigs: "runtimeConfigs",
  scannerVersions: "scannerVersions",
  attributeTemplateVersions: "attributeTemplateVersions",
  rawResponses: "rawResponses",
  aggregationSnapshots: "aggregationSnapshots",
  employees: "employees",
  reimbursements: "reimbursements",
  auditEvents: "auditEvents",
  counters: "counters",
  campaigns: "campaigns",
  invitations: "invitations",
  budgets: "budgets",
  budgetHistory: "budgetHistory",
  notifications: "notifications",
  claimMessages: "claimMessages",
  claimRequests: "claimRequests",
  invoices: "invoices",
  paymentRecords: "paymentRecords",
  clinicUsers: "clinicUsers",
  clinicTenants: "clinicTenants",
  clinicSessions: "clinicSessions",
  clinics: "clinics",
} as const;

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

export interface TenantDocument extends TimestampFields {
  tenantId: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  subdomain?: string;
  status: TenantRuntimeConfig["tenant"]["status"];
  plan: TenantRuntimeConfig["tenant"]["plan"];
  branding: TenantBrandingConfig;
  content?: TenantContentConfig;
  brandingVersionId: string;
  activeRuntimeConfigId: string;
  activeRuntimeConfigPublishedAt: string;
}

export interface RuntimeConfigDocument extends TimestampFields {
  runtimeConfigId: string;
  tenantId: string;
  tenantSlug: string;
  tenantSubdomain?: string;
  publishedAt: string;
  isActive: boolean;
  versionRefs: RuntimeVersionRefs;
  branding: TenantBrandingConfig;
  content?: TenantContentConfig;
  attributeTemplate: RuntimeAttributeTemplate;
  scannerVersion: RuntimeScannerVersion;
  runtimeSettings: TenantRuntimeConfig["runtimeSettings"];
}

export interface ScannerVersionDocument extends TimestampFields {
  scannerVersionId: string;
  tenantId: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  categories: RuntimeScannerVersion["categories"];
  followUpTriggers: RuntimeScannerVersion["followUpTriggers"];
}

export interface AttributeTemplateVersionDocument extends TimestampFields {
  attributeTemplateVersionId: string;
  tenantId: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  attributeTemplate: RuntimeAttributeTemplate;
}

export interface RawResponseRow extends SurveySubmissionResponse {
  questionKind: ScannerQuestion["kind"];
  categoryId: string;
  categoryLabel: string;
  subdomainId: string;
  subdomainLabel: string;
  triggerQuestionId?: string;
}

export interface RawResponseDocument extends TimestampFields {
  submissionId: string;
  submittedAt: string;
  tenantId: string;
  tenantSlug: string;
  runtimeConfigId: string;
  versionRefs: RuntimeVersionRefs;
  attributes: SurveySubmissionAttributes;
  responses: RawResponseRow[];
  completionState: SurveySubmission["completionState"];
  metadata: SurveySubmission["metadata"];
}

export interface AggregationSnapshotDocument
  extends DashboardAggregationSnapshot,
    TimestampFields {}

export type EmployeeStatus = "not_registered" | "active" | "inactive" | "suspended" | "archived";

export interface EmployeeDocument extends TimestampFields {
  employeeId: string;
  tenantId: string;
  employeeCode: string;
  name: string | null;
  email: string;
  status: EmployeeStatus;
  passwordHash: string | null;
  mustChangePassword: boolean;
  phoneNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastAccessAt: string | null;
  /** Single-use password-reset token (Phase D). Cleared after a successful reset. */
  passwordResetToken?: string | null;
  /** ISO timestamp when the password-reset token expires (Phase D). */
  passwordResetTokenExpiresAt?: string | null;
}

export type ClinicUserStatus = "active" | "disabled" | "archived";

export interface ClinicUserDocument extends TimestampFields {
  clinicUserId: string;
  email: string;
  passwordHash: string;
  name: string;
  clinicIds: string[];
  tenantIds: string[];
  status: ClinicUserStatus;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  lastAccessAt: string | null;
}

/**
 * Clinic directory entry (Phase H). Lightweight denormalized record used to
 * resolve a clinic's display name when a clinic portal user submits a claim.
 * `tenantIds` documents which organizations a clinic serves (MVP — org
 * switching). The admin app remains the source of truth for the full directory;
 * this collection is an optional convenience mirror for the tenantapp.
 */
export interface ClinicDirectoryDocument extends TimestampFields {
  clinicId: string;
  name: string;
  tenantIds?: string[];
  status: "active" | "disabled";
}

export interface ClaimHistoryEntry {
  status: "pending" | "in_progress" | "approved" | "to_be_paid" | "rejected" | "frozen" | "paid";
  actorId: string;
  actorRole: "employee" | "tenantAdmin";
  note?: string;
  timestamp: string;
}

export interface ReimbursementDocument extends TimestampFields {
  reimbursementId: string;
  claimNumber?: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptHash?: string;
  serviceDate?: string;
  sessionCount?: number;
  sessionTypes?: string[];
  sessionFor?: string;
  sessionForOther?: string;
  contactCountryCode?: string;
  contactNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  clinicId?: string;
  clinicName?: string;
  status: "pending" | "in_progress" | "approved" | "to_be_paid" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  history?: ClaimHistoryEntry[];
}

/**
 * Payment record — a ledger entry tracking where money went for a claim.
 * Written when a claim is queued for payment (`to_be_paid`) and finalized when
 * money is actually sent (`paid`). Claims without a clinic are grouped under a
 * null clinicId in the payout queue.
 */
export type PaymentRecordStatus = "to_be_paid" | "paid";

export interface PaymentRecordDocument extends TimestampFields {
  paymentRecordId: string;
  tenantId: string;
  claimId: string;
  invoiceId?: string;
  clinicId?: string;
  clinicName?: string;
  amount: number;
  status: PaymentRecordStatus;
  paidAt?: string;
  paidBy?: string;
  method?: string;
}

export interface AuditEventDocument {
  eventId: string;
  action: "employee_unlock" | "employee_suspended" | "employee_unsuspended" | "employee_archived" | "employee_registered" | "password_reset" | "password_changed";
  employeeId: string;
  tenantId: string;
  performedBy?: string;
  timestamp: string;
}

export type CampaignStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

export interface CampaignDocument extends TimestampFields {
  campaignId: string;
  tenantId: string;
  name: string;
  status: CampaignStatus;
  scheduledFor: string | null;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  completedCount: number;
  createdBy: string;
}

export type InvitationStatus = "pending" | "sent" | "opened" | "completed" | "bounced" | "cancelled" | "expired";

export interface InvitationDocument extends TimestampFields {
  invitationId: string;
  campaignId: string;
  tenantId: string;
  employeeId: string;
  email: string;
  employeeCode: string;
  token: string;
  status: InvitationStatus;
  sentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface BudgetDocument extends TimestampFields {
  budgetId: string;
  tenantId: string;
  /** Budget year (e.g. 2026). Legacy records without a `year` are treated as the current year. */
  year: number;
  periodStart?: string;
  periodEnd?: string;
  totalAmount: number;
  createdBy: string;
}

export type BudgetHistoryType = "created" | "topup" | "adjust" | "override";

export interface BudgetHistoryDocument {
  historyId: string;
  tenantId: string;
  year: number;
  type: BudgetHistoryType;
  amount: number;
  beforeTotal: number;
  afterTotal: number;
  reason?: string;
  actorId: string;
  actorRole: string;
  createdAt: string;
}

export type NotificationRecipientType = "employee" | "tenantAdmin" | "superAdmin";

export type NotificationType =
  | "claim_approved"
  | "claim_rejected"
  | "claim_frozen"
  | "claim_paid"
  | "claim_payment_queued"
  | "claim_in_progress"
  | "claim_submitted"
  | "claim_resubmitted"
  | "progress_update_sent"
  | "claim_message"
  | "claim_request";

export interface NotificationDocument extends TimestampFields {
  notificationId: string;
  tenantId: string;
  claimId: string;
  claimNumber?: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
}

export type ClaimMessageRole = "employee" | "tenantAdmin" | "superAdmin" | "clinic" | "system";

export type ClaimMessageType = "message" | "official_update" | "system";

export interface ClaimMessageParticipant {
  role: ClaimMessageRole;
  id: string;
  name: string;
  /** `${role}:${id}` — used for read-tracking queries. */
  key: string;
}

export interface ClaimMessageDocument extends TimestampFields {
  messageId: string;
  tenantId: string;
  claimId: string;
  type: ClaimMessageType;
  participant: ClaimMessageParticipant;
  body: string;
  /** Participant keys that have read this message (author is implicitly read). */
  readBy: string[];
}

/**
 * Requests — separate from Chat. A request is when a clinic/employee asks
 * the organization whether something is possible (e.g. "Can we do an assessment
 * that costs 1000?"). The organization can: approve, reject, ask for more info,
 * or convert to a chat thread.
 */
export type ClaimRequestStatus = "pending" | "approved" | "rejected" | "more_info" | "converted_to_chat";

export type ClaimRequestRole = "employee" | "clinic" | "tenantAdmin";

export interface ClaimRequestParticipant {
  role: ClaimRequestRole;
  id: string;
  name: string;
  /** `${role}:${id}` — used for access control queries. */
  key: string;
}

export interface ClaimRequestDocument extends TimestampFields {
  requestId: string;
  tenantId: string;
  claimId: string;
  claimNumber?: string;
  subject: string;
  body: string;
  status: ClaimRequestStatus;
  requester: ClaimRequestParticipant;
  /** Responder (tenant admin) — set when status moves from pending. */
  responder?: ClaimRequestParticipant;
  /** Resolution note when approved/rejected/more_info. */
  resolutionNote?: string;
  /** If converted to chat, the messageId of the created chat thread. */
  convertedToChatMessageId?: string;
}

export type InvoiceStatus = "draft" | "generated" | "issued" | "paid";

export interface InvoiceLineItem {
  claimId: string;
  claimNumber?: string;
  clinicName?: string;
  amount: number;
  sessionCount?: number;
  serviceDate?: string;
}

export interface InvoiceDocument extends TimestampFields {
  invoiceId: string;
  tenantId: string;
  invoiceNumber: string;
  period: {
    from: string;
    to: string;
  };
  status: InvoiceStatus;
  generatedBy: string;
  generatedAt: string;
  issuedAt?: string;
  paidAt?: string;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

export type DashboardFilterKey = keyof DashboardSnapshotFilters;
