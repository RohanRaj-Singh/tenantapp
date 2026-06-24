import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  AuditEventDocument,
  EmployeeDocument,
  RawResponseDocument,
  ReimbursementDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";

export interface RawResponseAggregationQuery {
  tenantId: string;
  runtimeConfig: RuntimeConfigDocument;
  period?: {
    from: string;
    to: string;
  };
  filters: DashboardSnapshotFilters;
}

export interface SnapshotScopeQuery {
  tenantId: string;
  runtimeConfigId: string;
  scannerVersionId: string;
  calculationVersionId: string;
  filterHash: string;
  period?: {
    from: string;
    to: string;
  };
}

export interface TenantsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findBySlug(slug: string): Promise<TenantDocument | null>;
  findByTenantId(tenantId: string): Promise<TenantDocument | null>;
  findAllActive(): Promise<TenantDocument[]>;
  upsertSeed(document: TenantDocument): Promise<void>;
}

export interface RuntimeConfigsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findActiveByTenantSlug(tenantSlug: string): Promise<RuntimeConfigDocument | null>;
  findActiveByTenantId(tenantId: string): Promise<RuntimeConfigDocument | null>;
  findByRuntimeConfigId(runtimeConfigId: string): Promise<RuntimeConfigDocument | null>;
  upsertSeed(document: RuntimeConfigDocument): Promise<void>;
}

export interface ScannerVersionsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByScannerVersionId(scannerVersionId: string): Promise<ScannerVersionDocument | null>;
  upsertSeed(document: ScannerVersionDocument): Promise<void>;
}

export interface AttributeTemplateVersionsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByAttributeTemplateVersionId(
    attributeTemplateVersionId: string,
  ): Promise<AttributeTemplateVersionDocument | null>;
  upsertSeed(document: AttributeTemplateVersionDocument): Promise<void>;
}

export interface ResponsesRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(document: RawResponseDocument): Promise<void>;
  listForAggregation(query: RawResponseAggregationQuery): Promise<RawResponseDocument[]>;
}

export interface SnapshotsRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(document: AggregationSnapshotDocument): Promise<void>;
  findLatestByScope(
    scope: SnapshotScopeQuery,
  ): Promise<AggregationSnapshotDocument | null>;
}

export interface FindEmployeesOptions {
  search?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface FindEmployeesResult {
  employees: EmployeeDocument[];
  total: number;
}

export interface EmployeesRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByTenantId(
    tenantId: string,
    options?: FindEmployeesOptions,
  ): Promise<FindEmployeesResult>;
  findById(id: string): Promise<EmployeeDocument | null>;
  findByEmployeeCode(
    tenantId: string,
    employeeCode: string,
  ): Promise<EmployeeDocument | null>;
  insert(employee: EmployeeDocument): Promise<void>;
  update(
    id: string,
    updates: Partial<EmployeeDocument>,
  ): Promise<EmployeeDocument | null>;
  insertAuditEvent(event: AuditEventDocument): Promise<void>;
}

export interface FindReimbursementsOptions {
  search?: string;
  status?: string;
  employeeId?: string;
  tenantId?: string;
  skip?: number;
  limit?: number;
}

export interface FindReimbursementsResult {
  reimbursements: ReimbursementDocument[];
  total: number;
}

export interface ReimbursementsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByTenantId(
    tenantId: string,
    options?: FindReimbursementsOptions,
  ): Promise<FindReimbursementsResult>;
  findAll(options?: FindReimbursementsOptions): Promise<FindReimbursementsResult>;
  findById(id: string): Promise<ReimbursementDocument | null>;
  insert(reimbursement: ReimbursementDocument): Promise<void>;
  update(
    id: string,
    updates: Partial<ReimbursementDocument>,
  ): Promise<ReimbursementDocument | null>;
  incrementCounter(counterId: string): Promise<number>;
}

export interface RepositoryContext {
  tenants: TenantsRepositoryContract;
  runtimeConfigs: RuntimeConfigsRepositoryContract;
  scannerVersions: ScannerVersionsRepositoryContract;
  attributeTemplateVersions: AttributeTemplateVersionsRepositoryContract;
  responses: ResponsesRepositoryContract;
  snapshots: SnapshotsRepositoryContract;
  employees: EmployeesRepositoryContract;
  reimbursements: ReimbursementsRepositoryContract;
}
