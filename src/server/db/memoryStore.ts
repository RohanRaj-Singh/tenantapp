import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  AuditEventDocument,
  BudgetDocument,
  BudgetHistoryDocument,
  CampaignDocument,
  ClaimMessageDocument,
  ClaimRequestDocument,
  ClinicDirectoryDocument,
  ClinicUserDocument,
  EmployeeDocument,
  InvitationDocument,
  InvoiceDocument,
  NotificationDocument,
  PaymentRecordDocument,
  RawResponseDocument,
  ReimbursementDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";
import type { TenantSession, TenantUser } from "@/src/modules/tenant-auth/contracts/types";
import type { ClinicSession } from "@/src/modules/clinic-auth/contracts/types";

interface MemoryStore {
  tenants: Map<string, TenantDocument>;
  runtimeConfigs: Map<string, RuntimeConfigDocument>;
  scannerVersions: Map<string, ScannerVersionDocument>;
  attributeTemplateVersions: Map<string, AttributeTemplateVersionDocument>;
  rawResponses: RawResponseDocument[];
  aggregationSnapshots: AggregationSnapshotDocument[];
  tenantDashboardUsers: Map<string, TenantUser>;
  tenantDashboardSessions: Map<string, TenantSession>;
  clinicUsers: Map<string, ClinicUserDocument>;
  clinicSessions: Map<string, ClinicSession>;
  clinics: Map<string, ClinicDirectoryDocument>;
  employees: Map<string, EmployeeDocument>;
  reimbursements: Map<string, ReimbursementDocument>;
  auditEvents: AuditEventDocument[];
  counters: Map<string, number>;
  campaigns: Map<string, CampaignDocument>;
  invitations: Map<string, InvitationDocument>;
  budgets: Map<string, BudgetDocument>;
  budgetHistory: Map<string, BudgetHistoryDocument>;
  notifications: Map<string, NotificationDocument>;
  claimMessages: Map<string, ClaimMessageDocument>;
  claimRequests: Map<string, ClaimRequestDocument>;
  invoices: Map<string, InvoiceDocument>;
  paymentRecords: Map<string, PaymentRecordDocument>;
}

declare global {
  var __remedygccMemoryStore__: MemoryStore | undefined;
}

function createMemoryStore(): MemoryStore {
  return {
    tenants: new Map<string, TenantDocument>(),
    runtimeConfigs: new Map<string, RuntimeConfigDocument>(),
    scannerVersions: new Map<string, ScannerVersionDocument>(),
    attributeTemplateVersions: new Map<string, AttributeTemplateVersionDocument>(),
    rawResponses: [],
    aggregationSnapshots: [],
    tenantDashboardUsers: new Map<string, TenantUser>(),
    tenantDashboardSessions: new Map<string, TenantSession>(),
    clinicUsers: new Map<string, ClinicUserDocument>(),
    clinicSessions: new Map<string, ClinicSession>(),
    clinics: new Map<string, ClinicDirectoryDocument>(),
    employees: new Map<string, EmployeeDocument>(),
    reimbursements: new Map<string, ReimbursementDocument>(),
    auditEvents: [],
    counters: new Map<string, number>(),
    campaigns: new Map<string, CampaignDocument>(),
    invitations: new Map<string, InvitationDocument>(),
    budgets: new Map<string, BudgetDocument>(),
    budgetHistory: new Map<string, BudgetHistoryDocument>(),
    notifications: new Map<string, NotificationDocument>(),
    claimMessages: new Map<string, ClaimMessageDocument>(),
    claimRequests: new Map<string, ClaimRequestDocument>(),
    invoices: new Map<string, InvoiceDocument>(),
    paymentRecords: new Map<string, PaymentRecordDocument>(),
  };
}

export function getMemoryStore() {
  if (!global.__remedygccMemoryStore__) {
    global.__remedygccMemoryStore__ = createMemoryStore();
  }

  const store = global.__remedygccMemoryStore__;
  // Backfill any collection maps added after this store was first created
  // (e.g. dev servers that were started before a new collection shipped). This
  // prevents "Cannot read properties of undefined (reading 'set'/'values')"
  // crashes when a stale in-memory store is reused across hot reloads.
  if (!store.claimRequests) store.claimRequests = new Map<string, ClaimRequestDocument>();

  return store;
}
