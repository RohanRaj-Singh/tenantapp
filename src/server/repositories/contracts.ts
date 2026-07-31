import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
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
  NotificationRecipientType,
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
  findAll(
    options?: FindEmployeesOptions & { tenantId?: string },
  ): Promise<FindEmployeesResult>;
  findByTenantId(
    tenantId: string,
    options?: FindEmployeesOptions,
  ): Promise<FindEmployeesResult>;
  findById(id: string): Promise<EmployeeDocument | null>;
  findByEmployeeCode(
    tenantId: string,
    employeeCode: string,
  ): Promise<EmployeeDocument | null>;
  findByTenantAndEmail(
    tenantId: string,
    email: string,
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

export interface FindCampaignsOptions {
  tenantId?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface FindCampaignsResult {
  campaigns: CampaignDocument[];
  total: number;
}

export interface CampaignsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByTenantId(
    tenantId: string,
    options?: FindCampaignsOptions,
  ): Promise<FindCampaignsResult>;
  findById(id: string): Promise<CampaignDocument | null>;
  insert(campaign: CampaignDocument): Promise<void>;
  update(
    id: string,
    updates: Partial<CampaignDocument>,
  ): Promise<CampaignDocument | null>;
}

export interface FindInvitationsOptions {
  tenantId?: string;
  campaignId?: string;
  employeeId?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface FindInvitationsResult {
  invitations: InvitationDocument[];
  total: number;
}

export interface InvitationsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByTenantId(
    tenantId: string,
    options?: FindInvitationsOptions,
  ): Promise<FindInvitationsResult>;
  findByCampaignId(
    campaignId: string,
    options?: FindInvitationsOptions,
  ): Promise<FindInvitationsResult>;
  findById(id: string): Promise<InvitationDocument | null>;
  findByToken(token: string): Promise<InvitationDocument | null>;
  insert(invitation: InvitationDocument): Promise<void>;
  insertMany(invitations: InvitationDocument[]): Promise<void>;
  update(
    id: string,
    updates: Partial<InvitationDocument>,
  ): Promise<InvitationDocument | null>;
  updateMany(
    filter: { campaignId?: string; status?: string },
    updates: Partial<InvitationDocument>,
  ): Promise<number>;
  countByStatus(tenantId: string): Promise<Record<string, number>>;
}

export interface BudgetsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findByTenantId(tenantId: string): Promise<BudgetDocument | null>;
  insert(budget: BudgetDocument): Promise<void>;
  update(id: string, updates: Partial<BudgetDocument>): Promise<BudgetDocument | null>;
}

export interface ListNotificationsOptions {
  unreadOnly?: boolean;
  skip?: number;
  limit?: number;
}

export interface ClaimRequestsRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(request: ClaimRequestDocument): Promise<void>;
  listByClaimId(claimId: string, options?: { limit?: number }): Promise<ClaimRequestDocument[]>;
  findById(requestId: string): Promise<ClaimRequestDocument | null>;
  update(
    requestId: string,
    updates: Partial<ClaimRequestDocument>,
  ): Promise<ClaimRequestDocument | null>;
}

export interface ClaimMessagesRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(message: ClaimMessageDocument): Promise<void>;
  listByClaimId(claimId: string, options?: { limit?: number }): Promise<ClaimMessageDocument[]>;
  unreadCount(claimId: string, viewerKey: string): Promise<number>;
  markThreadRead(claimId: string, viewerKey: string): Promise<number>;
}

export interface NotificationsRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(notification: NotificationDocument): Promise<void>;
  listForRecipient(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
    options?: ListNotificationsOptions,
  ): Promise<NotificationDocument[]>;
  countUnread(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number>;
  markRead(
    notificationId: string,
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<NotificationDocument | null>;
  markAllRead(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number>;
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
  campaigns: CampaignsRepositoryContract;
  invitations: InvitationsRepositoryContract;
  budgets: BudgetsRepositoryContract;
  notifications: NotificationsRepositoryContract;
  claimMessages: ClaimMessagesRepositoryContract;
  claimRequests: ClaimRequestsRepositoryContract;
}
