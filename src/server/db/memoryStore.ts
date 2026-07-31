import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  AuditEventDocument,
  BudgetDocument,
  CampaignDocument,
  ClaimMessageDocument,
  ClaimRequestDocument,
  EmployeeDocument,
  InvitationDocument,
  NotificationDocument,
  RawResponseDocument,
  ReimbursementDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";
import type { TenantSession, TenantUser } from "@/src/modules/tenant-auth/contracts/types";

interface MemoryStore {
  tenants: Map<string, TenantDocument>;
  runtimeConfigs: Map<string, RuntimeConfigDocument>;
  scannerVersions: Map<string, ScannerVersionDocument>;
  attributeTemplateVersions: Map<string, AttributeTemplateVersionDocument>;
  rawResponses: RawResponseDocument[];
  aggregationSnapshots: AggregationSnapshotDocument[];
  tenantDashboardUsers: Map<string, TenantUser>;
  tenantDashboardSessions: Map<string, TenantSession>;
  employees: Map<string, EmployeeDocument>;
  reimbursements: Map<string, ReimbursementDocument>;
  auditEvents: AuditEventDocument[];
  counters: Map<string, number>;
  campaigns: Map<string, CampaignDocument>;
  invitations: Map<string, InvitationDocument>;
  budgets: Map<string, BudgetDocument>;
  notifications: Map<string, NotificationDocument>;
  claimMessages: Map<string, ClaimMessageDocument>;
  claimRequests: Map<string, ClaimRequestDocument>;
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
    employees: new Map<string, EmployeeDocument>(),
    reimbursements: new Map<string, ReimbursementDocument>(),
    auditEvents: [],
    counters: new Map<string, number>(),
    campaigns: new Map<string, CampaignDocument>(),
    invitations: new Map<string, InvitationDocument>(),
    budgets: new Map<string, BudgetDocument>(),
    notifications: new Map<string, NotificationDocument>(),
    claimMessages: new Map<string, ClaimMessageDocument>(),
    claimRequests: new Map<string, ClaimRequestDocument>(),
  };
}

export function getMemoryStore() {
  if (!global.__remedygccMemoryStore__) {
    global.__remedygccMemoryStore__ = createMemoryStore();
  }

  return global.__remedygccMemoryStore__;
}
