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

export type DashboardFilterKey = keyof DashboardSnapshotFilters;
