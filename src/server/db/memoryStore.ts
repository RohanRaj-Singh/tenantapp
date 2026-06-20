import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  EmployeeDocument,
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
  };
}

export function getMemoryStore() {
  if (!global.__remedygccMemoryStore__) {
    global.__remedygccMemoryStore__ = createMemoryStore();
  }

  return global.__remedygccMemoryStore__;
}
