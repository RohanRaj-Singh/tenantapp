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
  notifications: "notifications",
  claimMessages: "claimMessages",
  claimRequests: "claimRequests",
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

export type EmployeeStatus = "not_registered" | "active" | "inactive" | "suspended";

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
}

export interface ClaimHistoryEntry {
  status: "pending" | "in_progress" | "approved" | "rejected" | "frozen" | "paid";
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
  status: "pending" | "in_progress" | "approved" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  history?: ClaimHistoryEntry[];
}

export interface AuditEventDocument {
  eventId: string;
  action: "employee_unlock" | "employee_suspended" | "employee_unsuspended" | "employee_registered" | "password_reset" | "password_changed";
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
  totalAmount: number;
  createdBy: string;
}

export type NotificationRecipientType = "employee" | "tenantAdmin" | "superAdmin";

export type NotificationType =
  | "claim_approved"
  | "claim_rejected"
  | "claim_frozen"
  | "claim_paid"
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

export type ClaimMessageRole = "employee" | "tenantAdmin" | "superAdmin" | "clinic";

export type ClaimMessageType = "text" | "official_update";

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

export type ClaimRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "more_info"
  | "converted_to_chat";

export interface ClaimRequestDocument extends TimestampFields {
  requestId: string;
  tenantId: string;
  claimId: string;
  requester: ClaimMessageParticipant;
  subject: string;
  details: string;
  status: ClaimRequestStatus;
  decisionNote?: string;
  /** Participant key of the tenant admin who decided. */
  decisionBy?: string;
  decidedAt?: string;
  /** Set when the request is converted to a chat thread. */
  convertedToMessageId?: string;
}

export type DashboardFilterKey = keyof DashboardSnapshotFilters;
