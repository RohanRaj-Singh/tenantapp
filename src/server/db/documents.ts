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

export interface EmployeeDocument extends TimestampFields {
  employeeId: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  /** scrypt salt:hash string for PIN-based employee authentication */
  pinHash: string;
  /** Number of consecutive failed login attempts (resets on success) */
  failedLoginAttempts: number;
  /** ISO-8601 timestamp until which the employee is locked out, or null */
  lockedUntil: string | null;
  /** ISO-8601 timestamp of the last successful login, or null */
  lastAccessAt: string | null;
}

export interface ClaimHistoryEntry {
  status: "pending" | "approved" | "rejected" | "frozen" | "paid";
  actorId: string;
  actorRole: "employee" | "tenantAdmin";
  note?: string;
  timestamp: string;
}

export interface ReimbursementDocument extends TimestampFields {
  reimbursementId: string;
  /** Human-readable claim reference number (e.g. RMB-2026-000001) */
  claimNumber?: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  /** SHA-256 hex digest of the uploaded receipt file */
  receiptHash?: string;
  /** Date of service in YYYY-MM-DD format */
  serviceDate?: string;
  /** Clinic slug/identifier the claim relates to */
  clinicId?: string;
  /** Denormalized clinic name for display */
  clinicName?: string;
  status: "pending" | "approved" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  /** Append-only audit trail */
  history?: ClaimHistoryEntry[];
}

export interface AuditEventDocument {
  eventId: string;
  action: "pin_reset" | "employee_unlock";
  employeeId: string;
  tenantId: string;
  performedBy?: string;
  timestamp: string;
}

export type DashboardFilterKey = keyof DashboardSnapshotFilters;
