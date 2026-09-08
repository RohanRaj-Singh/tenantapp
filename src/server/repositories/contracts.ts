import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  AuditEventDocument,
  BudgetDocument,
  BudgetHistoryDocument,
  CampaignDocument,
  ClaimMessageDocument,
  ClaimRequestDocument,
  ClaimRequestStatus,
  ClinicDirectoryDocument,
  ClinicUserDocument,
  EmployeeDocument,
  InvitationDocument,
  InvoiceDocument,
  NotificationDocument,
  NotificationRecipientType,
  PaymentRecordDocument,
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
  /** When true, archived employees are excluded from results. */
  excludeArchived?: boolean;
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
  /**
   * Batch lookup by employee ID. Used to replace per-claim N+1 employee
   * lookups (e.g. `listClinicReimbursements`). Returns only documents that
   * exist; missing IDs are silently omitted. Order is not guaranteed.
   */
  findByIds(ids: string[]): Promise<EmployeeDocument[]>;
  findByEmployeeCode(
    tenantId: string,
    employeeCode: string,
  ): Promise<EmployeeDocument | null>;
  findByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<EmployeeDocument | null>;
  /**
   * Find an employee by a password-reset token (Phase D).
   * Global lookup across tenants — reset links are single-URL, token-only.
   */
  findByResetToken(token: string): Promise<EmployeeDocument | null>;
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
  /**
   * Multiple tenant filter (Phase H clinic portal multi-tenant fan-in).
   * When set, takes precedence over `tenantId` and the query is restricted
   * to claims whose `tenantId` is in the supplied set.
   */
  tenantIds?: string[];
  /** Filter to a single clinic's claims (Phase H clinic portal). */
  clinicId?: string;
  /**
   * Multiple clinic filter (Phase H clinic portal multi-clinic fan-in).
   * When set, takes precedence over `clinicId` and the query is restricted
   * to claims whose `clinicId` is in the supplied set. Requires `tenantIds`
   * to be set as well; combining the two arrays gives a single
   * `findAll({ tenantIds, clinicIds })` call instead of N×M fan-out.
   */
  clinicIds?: string[];
  skip?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "status";
  sortOrder?: "asc" | "desc";
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
  /**
   * Batch lookup by id. Returns only documents that exist; missing ids are
   * silently omitted (the caller is responsible for tolerating the
   * shorter result). Order is not guaranteed.
   *
   * Used by workspace builders that previously issued one `findById` per
   * record (N+1) and have been consolidated to a single fan-out query.
   */
  findByIds(ids: string[]): Promise<ReimbursementDocument[]>;
  insert(reimbursement: ReimbursementDocument): Promise<void>;
  update(
    id: string,
    updates: Partial<ReimbursementDocument>,
  ): Promise<ReimbursementDocument | null>;
  incrementCounter(counterId: string): Promise<number>;
  /**
   * Sums the claim `amount` per status for a tenant.
   *
   * Keys are the claim statuses (e.g. `pending`, `in_progress`, `approved`,
   * `rejected`, `frozen`, `paid`). Statuses with no claims are omitted. This is
   * the performance-friendly aggregation used by the budget overview instead of
   * pulling the full claim set into memory.
   */
  aggregateByStatus(tenantId: string): Promise<Record<string, number>>;
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
  findByTenantAndYear(tenantId: string, year: number): Promise<BudgetDocument | null>;
  insert(budget: BudgetDocument): Promise<void>;
  update(id: string, updates: Partial<BudgetDocument>): Promise<BudgetDocument | null>;
}

export interface ListBudgetHistoryOptions {
  type?: string;
  skip?: number;
  limit?: number;
}

export interface BudgetHistoryRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(history: BudgetHistoryDocument): Promise<void>;
  listByTenant(
    tenantId: string,
    options?: ListBudgetHistoryOptions,
  ): Promise<BudgetHistoryDocument[]>;
}

export interface ListNotificationsOptions {
  unreadOnly?: boolean;
  skip?: number;
  limit?: number;
}

export interface ClaimMessagesRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(message: ClaimMessageDocument): Promise<void>;
  listByClaimId(claimId: string, options?: { limit?: number }): Promise<ClaimMessageDocument[]>;
  unreadCount(claimId: string, viewerKey: string): Promise<number>;
  markThreadRead(claimId: string, viewerKey: string): Promise<number>;
}

export interface ClaimRequestsRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(request: ClaimRequestDocument): Promise<void>;
  findById(requestId: string): Promise<ClaimRequestDocument | null>;
  listByClaimId(claimId: string): Promise<ClaimRequestDocument[]>;
  listByTenantId(
    tenantId: string,
    options?: { status?: ClaimRequestStatus; limit?: number },
  ): Promise<ClaimRequestDocument[]>;
  update(requestId: string, updates: Partial<ClaimRequestDocument>): Promise<ClaimRequestDocument | null>;
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

export interface ListInvoicesOptions {
  status?: string;
  skip?: number;
  limit?: number;
}

export interface FindInvoicesResult {
  invoices: InvoiceDocument[];
  total: number;
}

export interface InvoicesRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(invoice: InvoiceDocument): Promise<void>;
  findById(id: string): Promise<InvoiceDocument | null>;
  /**
   * Batch lookup by id. Returns only documents that exist; missing ids are
   * silently omitted. Order is not guaranteed.
   */
  findByIds(ids: string[]): Promise<InvoiceDocument[]>;
  /** Find invoices whose line items reference any of the given claim ids. */
  findByClaimIds(claimIds: string[]): Promise<InvoiceDocument[]>;
  listByTenant(
    tenantId: string,
    options?: ListInvoicesOptions,
  ): Promise<FindInvoicesResult>;
  findAll(
    options?: ListInvoicesOptions & { tenantId?: string },
  ): Promise<FindInvoicesResult>;
  update(
    id: string,
    updates: Partial<InvoiceDocument>,
  ): Promise<InvoiceDocument | null>;
  countByStatus(tenantId: string): Promise<Record<string, number>>;
}

export interface PaymentRecordsRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(record: PaymentRecordDocument): Promise<void>;
  update(
    id: string,
    updates: Partial<PaymentRecordDocument>,
  ): Promise<PaymentRecordDocument | null>;
  findByClaimId(claimId: string): Promise<PaymentRecordDocument | null>;
  listByTenant(tenantId: string): Promise<PaymentRecordDocument[]>;
  listByStatus(status: PaymentRecordDocument["status"]): Promise<PaymentRecordDocument[]>;
  /** Atomically increment a named counter (used for payment references). */
  incrementCounter(counterId: string): Promise<number>;
}

export interface FindClinicUsersOptions {
  tenantId?: string;
  clinicId?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface FindClinicUsersResult {
  clinicUsers: ClinicUserDocument[];
  total: number;
}

export interface ClinicUsersRepositoryContract {
  ensureIndexes(): Promise<void>;
  insert(user: ClinicUserDocument): Promise<void>;
  findByEmail(email: string): Promise<ClinicUserDocument | null>;
  findById(id: string): Promise<ClinicUserDocument | null>;
  update(
    id: string,
    updates: Partial<ClinicUserDocument>,
  ): Promise<ClinicUserDocument | null>;
  list(options?: FindClinicUsersOptions): Promise<FindClinicUsersResult>;
}

export interface ClinicsRepositoryContract {
  ensureIndexes(): Promise<void>;
  findById(clinicId: string): Promise<ClinicDirectoryDocument | null>;
  upsert(document: ClinicDirectoryDocument): Promise<void>;
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
  budgetHistory: BudgetHistoryRepositoryContract;
  notifications: NotificationsRepositoryContract;
  claimMessages: ClaimMessagesRepositoryContract;
  claimRequests: ClaimRequestsRepositoryContract;
  invoices: InvoicesRepositoryContract;
  paymentRecords: PaymentRecordsRepositoryContract;
  clinicUsers: ClinicUsersRepositoryContract;
  clinics: ClinicsRepositoryContract;
}
