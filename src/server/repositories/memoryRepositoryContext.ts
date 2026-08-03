import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import { developmentSeedBundles } from "@/src/server/seed/mockDocuments";
import { getMemoryStore } from "@/src/server/db/memoryStore";
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
  NotificationRecipientType,
  PaymentRecordDocument,
  RawResponseDocument,
  ReimbursementDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";
import type {
  AttributeTemplateVersionsRepositoryContract,
  BudgetHistoryRepositoryContract,
  BudgetsRepositoryContract,
  CampaignsRepositoryContract,
  ClaimMessagesRepositoryContract,
  ClaimRequestsRepositoryContract,
  ClinicsRepositoryContract,
  ClinicUsersRepositoryContract,
  EmployeesRepositoryContract,
  FindCampaignsOptions,
  FindCampaignsResult,
  FindClinicUsersOptions,
  FindClinicUsersResult,
  FindEmployeesOptions,
  FindEmployeesResult,
  FindInvitationsOptions,
  FindInvitationsResult,
  FindInvoicesResult,
  FindReimbursementsOptions,
  FindReimbursementsResult,
  InvoicesRepositoryContract,
  InvitationsRepositoryContract,
  ListBudgetHistoryOptions,
  ListInvoicesOptions,
  ListNotificationsOptions,
  NotificationsRepositoryContract,
  PaymentRecordsRepositoryContract,
  RawResponseAggregationQuery,
  ReimbursementsRepositoryContract,
  RepositoryContext,
  ResponsesRepositoryContract,
  RuntimeConfigsRepositoryContract,
  ScannerVersionsRepositoryContract,
  SnapshotScopeQuery,
  SnapshotsRepositoryContract,
  TenantsRepositoryContract,
} from "./contracts";
import {
  INDIVIDUAL_TENANT_ID,
  INDIVIDUAL_TENANT_NAME,
  INDIVIDUAL_TENANT_SLUG,
} from "@/src/server/constants/individual";

function sortDescendingByDate<T>(items: T[], selector: (item: T) => string) {
  return [...items].sort((left, right) =>
    selector(right).localeCompare(selector(left)),
  );
}

function matchesPeriod(
  value: string,
  period?: {
    from: string;
    to: string;
  },
) {
  if (!period) {
    return true;
  }

  return value >= period.from && value <= period.to;
}

function matchesAttributeFilters(
  document: RawResponseDocument,
  filters: DashboardSnapshotFilters,
) {
  return (Object.entries(filters) as Array<[keyof DashboardSnapshotFilters, string]>).every(
    ([key, value]) => !value || document.attributes[key] === value,
  );
}

class MemoryTenantsRepository implements TenantsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findBySlug(slug: string) {
    return (
      Array.from(this.store.tenants.values()).find(
        (tenant) => tenant.slug === slug || tenant.subdomain === slug,
      ) ?? null
    );
  }

  async findByTenantId(tenantId: string) {
    return this.store.tenants.get(tenantId) ?? null;
  }

  async findAllActive() {
    return Array.from(this.store.tenants.values()).filter(
      (tenant) => tenant.status === "active",
    );
  }

  async upsertSeed(document: TenantDocument) {
    this.store.tenants.set(document.tenantId, document);
  }
}

class MemoryRuntimeConfigsRepository implements RuntimeConfigsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findActiveByTenantSlug(tenantSlug: string) {
    return (
      Array.from(this.store.runtimeConfigs.values()).find(
        (runtimeConfig) =>
          runtimeConfig.isActive &&
          (
            runtimeConfig.tenantSlug === tenantSlug
            || runtimeConfig.tenantSubdomain === tenantSlug
          ),
      ) ?? null
    );
  }

  async findActiveByTenantId(tenantId: string) {
    return (
      Array.from(this.store.runtimeConfigs.values()).find(
        (runtimeConfig) => runtimeConfig.tenantId === tenantId && runtimeConfig.isActive,
      ) ?? null
    );
  }

  async findByRuntimeConfigId(runtimeConfigId: string) {
    return this.store.runtimeConfigs.get(runtimeConfigId) ?? null;
  }

  async upsertSeed(document: RuntimeConfigDocument) {
    this.store.runtimeConfigs.set(document.runtimeConfigId, document);
  }
}

class MemoryScannerVersionsRepository implements ScannerVersionsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByScannerVersionId(scannerVersionId: string) {
    return this.store.scannerVersions.get(scannerVersionId) ?? null;
  }

  async upsertSeed(document: ScannerVersionDocument) {
    this.store.scannerVersions.set(document.scannerVersionId, document);
  }
}

class MemoryAttributeTemplateVersionsRepository
  implements AttributeTemplateVersionsRepositoryContract
{
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByAttributeTemplateVersionId(attributeTemplateVersionId: string) {
    return this.store.attributeTemplateVersions.get(attributeTemplateVersionId) ?? null;
  }

  async upsertSeed(document: AttributeTemplateVersionDocument) {
    this.store.attributeTemplateVersions.set(document.attributeTemplateVersionId, document);
  }
}

class MemoryResponsesRepository implements ResponsesRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(document: RawResponseDocument) {
    this.store.rawResponses = [...this.store.rawResponses, document];
  }

  async listForAggregation(query: RawResponseAggregationQuery) {
    return sortDescendingByDate(
      this.store.rawResponses.filter((response) => {
        if (response.tenantId !== query.tenantId) {
          return false;
        }

        if (response.runtimeConfigId !== query.runtimeConfig.runtimeConfigId) {
          return false;
        }

        if (
          response.versionRefs.scannerVersionId !==
          query.runtimeConfig.versionRefs.scannerVersionId
        ) {
          return false;
        }

        if (
          response.versionRefs.attributeTemplateVersionId !==
          query.runtimeConfig.versionRefs.attributeTemplateVersionId
        ) {
          return false;
        }

        if (
          response.versionRefs.calculationVersionId !==
          query.runtimeConfig.versionRefs.calculationVersionId
        ) {
          return false;
        }

        if (response.completionState.status !== "completed") {
          return false;
        }

        if (!matchesPeriod(response.submittedAt, query.period)) {
          return false;
        }

        return matchesAttributeFilters(response, query.filters);
      }),
      (response) => response.submittedAt,
    );
  }
}

class MemorySnapshotsRepository implements SnapshotsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(document: AggregationSnapshotDocument) {
    this.store.aggregationSnapshots = [...this.store.aggregationSnapshots, document];
  }

  async findLatestByScope(scope: SnapshotScopeQuery) {
    const matches = this.store.aggregationSnapshots.filter((snapshot) => {
      if (snapshot.tenantId !== scope.tenantId) {
        return false;
      }

      if (snapshot.runtimeConfigId !== scope.runtimeConfigId) {
        return false;
      }

      if (snapshot.scannerVersionId !== scope.scannerVersionId) {
        return false;
      }

      if (snapshot.calculationVersionId !== scope.calculationVersionId) {
        return false;
      }

      if (snapshot.filterHash !== scope.filterHash) {
        return false;
      }

      if (
        scope.period &&
        (snapshot.period.from !== scope.period.from || snapshot.period.to !== scope.period.to)
      ) {
        return false;
      }

      return true;
    });

    return sortDescendingByDate(matches, (snapshot) => snapshot.generatedAt)[0] ?? null;
  }
}

class MemoryEmployeesRepository implements EmployeesRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findAll(
    options: FindEmployeesOptions & { tenantId?: string } = {},
  ): Promise<FindEmployeesResult> {
    const { search, status, tenantId, excludeArchived, skip = 0, limit = 20 } = options;

    let filtered = Array.from(this.store.employees.values());

    if (tenantId) {
      filtered = filtered.filter((emp) => emp.tenantId === tenantId);
    }

    if (status) {
      filtered = filtered.filter((emp) => emp.status === status);
    }

    if (excludeArchived) {
      filtered = filtered.filter((emp) => emp.status !== "archived");
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          (emp.name ?? "").toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    const total = filtered.length;
    const employees = filtered.slice(skip, skip + limit);

    return { employees, total };
  }

  async findByTenantId(
    tenantId: string,
    options: FindEmployeesOptions = {},
  ): Promise<FindEmployeesResult> {
    const { search, status, excludeArchived, skip = 0, limit = 20 } = options;

    let filtered = Array.from(this.store.employees.values()).filter(
      (emp) => emp.tenantId === tenantId,
    );

    if (status) {
      filtered = filtered.filter((emp) => emp.status === status);
    }

    if (excludeArchived) {
      filtered = filtered.filter((emp) => emp.status !== "archived");
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          (emp.name ?? "").toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    const total = filtered.length;
    const employees = filtered.slice(skip, skip + limit);

    return { employees, total };
  }

  async findById(id: string): Promise<EmployeeDocument | null> {
    return this.store.employees.get(id) ?? null;
  }

  async findByEmployeeCode(
    tenantId: string,
    employeeCode: string,
  ): Promise<EmployeeDocument | null> {
    return (
      Array.from(this.store.employees.values()).find(
        (e) => e.tenantId === tenantId && e.employeeCode === employeeCode,
      ) ?? null
    );
  }

  async findByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<EmployeeDocument | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return (
      Array.from(this.store.employees.values()).find(
        (e) => e.tenantId === tenantId && e.email.toLowerCase() === normalizedEmail,
      ) ?? null
    );
  }

  async findByResetToken(token: string): Promise<EmployeeDocument | null> {
    return (
      Array.from(this.store.employees.values()).find(
        (e) => e.passwordResetToken === token,
      ) ?? null
    );
  }

  async insert(employee: EmployeeDocument): Promise<void> {
    this.store.employees.set(employee.employeeId, { ...employee });
  }

  async update(
    id: string,
    updates: Partial<EmployeeDocument>,
  ): Promise<EmployeeDocument | null> {
    const current = this.store.employees.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...updates };
    this.store.employees.set(id, next);
    return { ...next };
  }

  async insertAuditEvent(event: AuditEventDocument): Promise<void> {
    this.store.auditEvents.push(event);
  }
}

class MemoryReimbursementsRepository implements ReimbursementsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByTenantId(
    tenantId: string,
    options: FindReimbursementsOptions = {},
  ): Promise<FindReimbursementsResult> {
    return this.findAll({ ...options, tenantId });
  }

  async findAll(
    options: FindReimbursementsOptions = {},
  ): Promise<FindReimbursementsResult> {
    const { search, status, employeeId, tenantId, clinicId, skip = 0, limit = 200, sortBy = "createdAt", sortOrder = "desc" } = options;

    let filtered = Array.from(this.store.reimbursements.values());

    if (tenantId) {
      filtered = filtered.filter((r) => r.tenantId === tenantId);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (employeeId) {
      filtered = filtered.filter((r) => r.employeeId === employeeId);
    }

    if (clinicId) {
      filtered = filtered.filter((r) => r.clinicId === clinicId);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.claimNumber ?? "").toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q),
      );
    }

    const direction = sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];
      if (left === right) {
        return 0;
      }
      return left < right ? -direction : direction;
    });

    const total = filtered.length;
    const reimbursements = filtered.slice(skip, skip + limit);

    return { reimbursements, total };
  }

  async findById(id: string): Promise<ReimbursementDocument | null> {
    return this.store.reimbursements.get(id) ?? null;
  }

  async insert(reimbursement: ReimbursementDocument): Promise<void> {
    this.store.reimbursements.set(reimbursement.reimbursementId, { ...reimbursement });
  }

  async update(
    id: string,
    updates: Partial<ReimbursementDocument>,
  ): Promise<ReimbursementDocument | null> {
    const current = this.store.reimbursements.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...updates };
    this.store.reimbursements.set(id, next);
    return { ...next };
  }

  async incrementCounter(counterId: string): Promise<number> {
    const current = this.store.counters.get(counterId) ?? 0;
    const next = current + 1;
    this.store.counters.set(counterId, next);
    return next;
  }

  async aggregateByStatus(tenantId: string): Promise<Record<string, number>> {
    const totals: Record<string, number> = {};
    for (const reimbursement of this.store.reimbursements.values()) {
      if (reimbursement.tenantId !== tenantId) {
        continue;
      }
      totals[reimbursement.status] =
        (totals[reimbursement.status] ?? 0) + reimbursement.amount;
    }
    return totals;
  }
}

// ── In-Memory Clinic Users Repository ─────────────────────────────────────────

class MemoryClinicUsersRepository implements ClinicUsersRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(user: ClinicUserDocument): Promise<void> {
    this.store.clinicUsers.set(user.clinicUserId, { ...user });
  }

  async findByEmail(email: string): Promise<ClinicUserDocument | null> {
    const normalized = email.trim().toLowerCase();
    const user = Array.from(this.store.clinicUsers.values()).find(
      (entry) => entry.email === normalized,
    );
    return user ? { ...user } : null;
  }

  async findById(id: string): Promise<ClinicUserDocument | null> {
    const user = this.store.clinicUsers.get(id);
    return user ? { ...user } : null;
  }

  async update(
    id: string,
    updates: Partial<ClinicUserDocument>,
  ): Promise<ClinicUserDocument | null> {
    const current = this.store.clinicUsers.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...updates };
    this.store.clinicUsers.set(id, next);
    return { ...next };
  }

  async list(
    options: FindClinicUsersOptions = {},
  ): Promise<FindClinicUsersResult> {
    const {
      tenantId,
      clinicId,
      status,
      search,
      skip = 0,
      limit = 50,
    } = options;

    let filtered = Array.from(this.store.clinicUsers.values());

    if (tenantId) {
      filtered = filtered.filter((u) => u.tenantIds.includes(tenantId));
    }

    if (clinicId) {
      filtered = filtered.filter((u) => u.clinicIds.includes(clinicId));
    }

    if (status) {
      filtered = filtered.filter((u) => u.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const clinicUsers = filtered.slice(skip, skip + limit).map((u) => ({ ...u }));

    return { clinicUsers, total };
  }
}

// ── In-Memory Clinics Directory Repository ───────────────────────────────────

class MemoryClinicsRepository implements ClinicsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findById(clinicId: string): Promise<ClinicDirectoryDocument | null> {
    const clinic = this.store.clinics.get(clinicId);
    return clinic ? { ...clinic } : null;
  }

  async upsert(document: ClinicDirectoryDocument): Promise<void> {
    this.store.clinics.set(document.clinicId, { ...document });
  }
}

let seeded = false;
let memoryRepositoryContext: RepositoryContext | null = null;

/** bcrypt hash of the known password "Password123" for development seeding (salt rounds 12). */
const DEV_PASSWORD_HASH =
  "$2b$12$FAmat16KTC/ptEbziQDHb.yZ9PNlSc9vBjJMPnR0mEMovdHYfeigO";

function ensureSeededMemoryStore(context: RepositoryContext) {
  if (seeded) {
    return;
  }

  developmentSeedBundles.forEach((bundle) => {
    void context.tenants.upsertSeed(bundle.tenant);
    void context.runtimeConfigs.upsertSeed(bundle.runtimeConfig);
    void context.scannerVersions.upsertSeed(bundle.scannerVersion);
    void context.attributeTemplateVersions.upsertSeed(bundle.attributeTemplateVersion);
  });

  // ── Seed marketing-site tenants for employee-access dev ───────────────────

  const nowIso = new Date("2026-06-20T00:00:00.000Z").toISOString();
  const employees = getMemoryStore().employees;

  const seedTenants = [
    { tenantId: "tenant-omantel", slug: "omantel", name: "Omantel" },
    { tenantId: "tenant-oq", slug: "oq", name: "OQ" },
    { tenantId: "tenant-pdo", slug: "pdo", name: "PDO" },
    // Reserved pool for public / individual sign-ups (FR-079, FR-082).
    { tenantId: INDIVIDUAL_TENANT_ID, slug: INDIVIDUAL_TENANT_SLUG, name: INDIVIDUAL_TENANT_NAME },
  ];

  for (const t of seedTenants) {
    void context.tenants.upsertSeed({
      tenantId: t.tenantId,
      name: t.name,
      slug: t.slug,
      status: "active" as const,
      plan: "pro" as const,
      branding: {},
      brandingVersionId: `brand_${t.slug}_dev`,
      activeRuntimeConfigId: `runtime_${t.slug}_dev`,
      activeRuntimeConfigPublishedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // ── Seed employees for marketing-site tenants ────────────────────────────

  const seedEmployees: Record<string, Array<{ code: string; name: string; email: string }>> = {
    "tenant-omantel": [
      { code: "OMT-001", name: "Ahmed Al Balushi", email: "ahmed.balushi@omantel.om" },
      { code: "OMT-002", name: "Mariam Al Siyabi", email: "mariam.siyabi@omantel.om" },
    ],
    "tenant-oq": [
      { code: "OQ-001", name: "Said Al Hinai", email: "said.hinai@oq.com" },
      { code: "OQ-002", name: "Noor Al Zadjali", email: "noor.zadjali@oq.com" },
    ],
    "tenant-pdo": [
      { code: "PDO-001", name: "Fatma Al Riyami", email: "fatma.riyami@pdo.co.om" },
      { code: "PDO-002", name: "Hamed Al Busaidi", email: "hamed.busaidi@pdo.co.om" },
    ],
  };

  for (const [tenantId, employeeList] of Object.entries(seedEmployees)) {
    for (const emp of employeeList) {
      const employeeId = `emp_${tenantId}_${emp.code.toLowerCase()}`;
      if (!employees.has(employeeId)) {
        const doc: EmployeeDocument = {
          employeeId,
          tenantId,
          employeeCode: emp.code,
          name: emp.name,
          email: emp.email,
          status: "active",
          passwordHash: DEV_PASSWORD_HASH,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastAccessAt: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        employees.set(employeeId, doc);
      }
    }
  }

  // ── Seed not_registered employees for registration flow testing ──────────

  const unregisteredEmployees: Array<{
    tenantId: string;
    code: string;
    email: string;
  }> = [
    { tenantId: "tenant-omantel", code: "OMT-REG-001", email: "new.employee@omantel.om" },
    { tenantId: "tenant-oq", code: "OQ-REG-001", email: "new.employee@oq.com" },
    { tenantId: "tenant-pdo", code: "PDO-REG-001", email: "new.employee@pdo.co.om" },
  ];

  for (const emp of unregisteredEmployees) {
    const employeeId = `emp_${emp.tenantId}_${emp.code.toLowerCase()}_reg`;
    if (!employees.has(employeeId)) {
      const doc: EmployeeDocument = {
        employeeId,
        tenantId: emp.tenantId,
        employeeCode: emp.code,
        name: null,
        email: emp.email,
        status: "not_registered",
        passwordHash: null,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastAccessAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      employees.set(employeeId, doc);
    }
  }

  // ── Seed clinic directory for clinic-portal dev ────────────────────────────

  const seedClinicDirectory: Array<{
    clinicId: string;
    name: string;
    tenantIds: string[];
  }> = [
    { clinicId: "clinic-eunoia", name: "Eunoia Clinic", tenantIds: ["tenant-omantel", "tenant-oq"] },
    { clinicId: "clinic-hayat", name: "Hayat Counseling Center", tenantIds: ["tenant-omantel"] },
    { clinicId: "clinic-al-harub", name: "Al Harub Medical Center", tenantIds: ["tenant-oq"] },
    { clinicId: "clinic-pdo-care", name: "PDO Care Center", tenantIds: ["tenant-pdo"] },
  ];

  for (const clinic of seedClinicDirectory) {
    void context.clinics.upsert({
      clinicId: clinic.clinicId,
      name: clinic.name,
      tenantIds: clinic.tenantIds,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  seeded = true;
}

// ── In-Memory Campaigns Repository ───────────────────────────────────────────

class MemoryCampaignsRepository implements CampaignsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByTenantId(
    tenantId: string,
    options: FindCampaignsOptions = {},
  ): Promise<FindCampaignsResult> {
    const { status, search, skip = 0, limit = 20 } = options;
    let filtered = Array.from(this.store.campaigns.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (status) {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const campaigns = filtered.slice(skip, skip + limit);
    return { campaigns, total };
  }

  async findById(id: string): Promise<CampaignDocument | null> {
    return this.store.campaigns.get(id) ?? null;
  }

  async insert(campaign: CampaignDocument): Promise<void> {
    this.store.campaigns.set(campaign.campaignId, { ...campaign });
  }

  async update(
    id: string,
    updates: Partial<CampaignDocument>,
  ): Promise<CampaignDocument | null> {
    const current = this.store.campaigns.get(id);
    if (!current) return null;
    const next = { ...current, ...updates };
    this.store.campaigns.set(id, next);
    return { ...next };
  }
}

// ── In-Memory Invitations Repository ─────────────────────────────────────────

class MemoryInvitationsRepository implements InvitationsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByTenantId(
    tenantId: string,
    options: FindInvitationsOptions = {},
  ): Promise<FindInvitationsResult> {
    return this.find({ ...options, tenantId });
  }

  async findByCampaignId(
    campaignId: string,
    options: FindInvitationsOptions = {},
  ): Promise<FindInvitationsResult> {
    return this.find({ ...options, campaignId });
  }

  async findById(id: string): Promise<InvitationDocument | null> {
    return this.store.invitations.get(id) ?? null;
  }

  async findByToken(token: string): Promise<InvitationDocument | null> {
    for (const inv of this.store.invitations.values()) {
      if (inv.token === token) return { ...inv };
    }
    return null;
  }

  async insert(invitation: InvitationDocument): Promise<void> {
    this.store.invitations.set(invitation.invitationId, { ...invitation });
  }

  async insertMany(invitations: InvitationDocument[]): Promise<void> {
    for (const inv of invitations) {
      this.store.invitations.set(inv.invitationId, { ...inv });
    }
  }

  async update(
    id: string,
    updates: Partial<InvitationDocument>,
  ): Promise<InvitationDocument | null> {
    const current = this.store.invitations.get(id);
    if (!current) return null;
    const next = { ...current, ...updates };
    this.store.invitations.set(id, next);
    return { ...next };
  }

  async updateMany(
    filter: { campaignId?: string; status?: string },
    updates: Partial<InvitationDocument>,
  ): Promise<number> {
    let count = 0;
    for (const [id, inv] of this.store.invitations) {
      if (filter.campaignId && inv.campaignId !== filter.campaignId) continue;
      if (filter.status && inv.status !== filter.status) continue;
      this.store.invitations.set(id, { ...inv, ...updates });
      count++;
    }
    return count;
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const inv of this.store.invitations.values()) {
      if (inv.tenantId !== tenantId) continue;
      counts[inv.status] = (counts[inv.status] ?? 0) + 1;
    }
    return counts;
  }

  private find(
    options: FindInvitationsOptions & { tenantId?: string; campaignId?: string },
  ): FindInvitationsResult {
    const { tenantId, campaignId, status, search, employeeId, skip = 0, limit = 50 } = options;
    let filtered = Array.from(this.store.invitations.values());

    if (tenantId) filtered = filtered.filter((i) => i.tenantId === tenantId);
    if (campaignId) filtered = filtered.filter((i) => i.campaignId === campaignId);
    if (status) filtered = filtered.filter((i) => i.status === status);
    if (employeeId) filtered = filtered.filter((i) => i.employeeId === employeeId);

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) => i.email.toLowerCase().includes(q) || i.employeeCode.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const invitations = filtered.slice(skip, skip + limit);
    return { invitations, total };
  }
}

// ── In-Memory Budgets Repository ─────────────────────────────────────────────

class MemoryBudgetsRepository implements BudgetsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async findByTenantId(tenantId: string): Promise<BudgetDocument | null> {
    for (const budget of this.store.budgets.values()) {
      if (budget.tenantId === tenantId) return { ...budget };
    }
    return null;
  }

  async findByTenantAndYear(
    tenantId: string,
    year: number,
  ): Promise<BudgetDocument | null> {
    for (const budget of this.store.budgets.values()) {
      if (budget.tenantId === tenantId && budget.year === year) return { ...budget };
    }
    return null;
  }

  async insert(budget: BudgetDocument): Promise<void> {
    this.store.budgets.set(budget.budgetId, { ...budget });
  }

  async update(
    id: string,
    updates: Partial<BudgetDocument>,
  ): Promise<BudgetDocument | null> {
    const current = this.store.budgets.get(id);
    if (!current) return null;
    const next = { ...current, ...updates };
    this.store.budgets.set(id, next);
    return { ...next };
  }
}

// ── In-Memory Budget History Repository ──────────────────────────────────────

class MemoryBudgetHistoryRepository implements BudgetHistoryRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(history: BudgetHistoryDocument): Promise<void> {
    this.store.budgetHistory.set(history.historyId, { ...history });
  }

  async listByTenant(
    tenantId: string,
    options: ListBudgetHistoryOptions = {},
  ): Promise<BudgetHistoryDocument[]> {
    const { type, skip = 0, limit = 50 } = options;
    let filtered = Array.from(this.store.budgetHistory.values()).filter(
      (h) => h.tenantId === tenantId,
    );

    if (type) {
      filtered = filtered.filter((h) => h.type === type);
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered.slice(skip, skip + limit).map((h) => ({ ...h }));
  }
}

// ── In-Memory Claim Messages Repository ──────────────────────────────────────

class MemoryClaimMessagesRepository implements ClaimMessagesRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(message: ClaimMessageDocument): Promise<void> {
    this.store.claimMessages.set(message.messageId, { ...message });
  }

  async listByClaimId(
    claimId: string,
    options: { limit?: number } = {},
  ): Promise<ClaimMessageDocument[]> {
    const { limit = 200 } = options;
    const matches = Array.from(this.store.claimMessages.values())
      .filter((m) => m.claimId === claimId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return matches.slice(-limit).map((m) => ({ ...m }));
  }

  async unreadCount(claimId: string, viewerKey: string): Promise<number> {
    return Array.from(this.store.claimMessages.values()).filter(
      (m) =>
        m.claimId === claimId &&
        m.participant.key !== viewerKey &&
        !m.readBy.includes(viewerKey),
    ).length;
  }

  async markThreadRead(claimId: string, viewerKey: string): Promise<number> {
    let count = 0;
    for (const [id, m] of this.store.claimMessages.entries()) {
      if (m.claimId === claimId && m.participant.key !== viewerKey && !m.readBy.includes(viewerKey)) {
        this.store.claimMessages.set(id, { ...m, readBy: [...m.readBy, viewerKey] });
        count += 1;
      }
    }
    return count;
  }
}

// ── In-Memory Claim Requests Repository ────────────────────────────────────────

class MemoryClaimRequestsRepository implements ClaimRequestsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(request: ClaimRequestDocument): Promise<void> {
    this.store.claimRequests.set(request.requestId, { ...request });
  }

  async findById(requestId: string): Promise<ClaimRequestDocument | null> {
    return this.store.claimRequests.get(requestId) ?? null;
  }

  async listByClaimId(claimId: string): Promise<ClaimRequestDocument[]> {
    const matches = Array.from(this.store.claimRequests.values())
      .filter((r) => r.claimId === claimId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return matches.map((r) => ({ ...r }));
  }

  async update(
    requestId: string,
    updates: Partial<ClaimRequestDocument>,
  ): Promise<ClaimRequestDocument | null> {
    const current = this.store.claimRequests.get(requestId);
    if (!current) return null;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.store.claimRequests.set(requestId, updated);
    return updated;
  }
}

// ── In-Memory Notifications Repository ───────────────────────────────────────

class MemoryNotificationsRepository implements NotificationsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(notification: NotificationDocument): Promise<void> {
    this.store.notifications.set(notification.notificationId, { ...notification });
  }

  async listForRecipient(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationDocument[]> {
    const { unreadOnly = false, skip = 0, limit = 20 } = options;
    const matches = Array.from(this.store.notifications.values())
      .filter(
        (n) =>
          n.tenantId === tenantId &&
          n.recipientType === recipientType &&
          n.recipientId === recipientId &&
          (!unreadOnly || !n.read),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches.slice(skip, skip + limit).map((n) => ({ ...n }));
  }

  async countUnread(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number> {
    return Array.from(this.store.notifications.values()).filter(
      (n) =>
        n.tenantId === tenantId &&
        n.recipientType === recipientType &&
        n.recipientId === recipientId &&
        !n.read,
    ).length;
  }

  async markRead(
    notificationId: string,
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<NotificationDocument | null> {
    const current = this.store.notifications.get(notificationId);
    if (
      !current ||
      current.tenantId !== tenantId ||
      current.recipientType !== recipientType ||
      current.recipientId !== recipientId
    ) {
      return null;
    }
    const next = {
      ...current,
      read: true,
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.notifications.set(notificationId, next);
    return { ...next };
  }

  async markAllRead(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number> {
    const nowIso = new Date().toISOString();
    let count = 0;
    for (const [id, n] of this.store.notifications.entries()) {
      if (
        n.tenantId === tenantId &&
        n.recipientType === recipientType &&
        n.recipientId === recipientId &&
        !n.read
      ) {
        this.store.notifications.set(id, { ...n, read: true, readAt: nowIso, updatedAt: nowIso });
        count += 1;
      }
    }
    return count;
  }
}

// ── In-Memory Invoices Repository ────────────────────────────────────────────

class MemoryInvoicesRepository implements InvoicesRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(invoice: InvoiceDocument): Promise<void> {
    this.store.invoices.set(invoice.invoiceId, { ...invoice });
  }

  async findById(id: string): Promise<InvoiceDocument | null> {
    const invoice = this.store.invoices.get(id);
    return invoice ? { ...invoice } : null;
  }

  async listByTenant(
    tenantId: string,
    options: ListInvoicesOptions = {},
  ): Promise<FindInvoicesResult> {
    return this.findAll({ ...options, tenantId });
  }

  async findAll(
    options: ListInvoicesOptions & { tenantId?: string } = {},
  ): Promise<FindInvoicesResult> {
    const { tenantId, status, skip = 0, limit = 100 } = options;

    let filtered = Array.from(this.store.invoices.values());

    if (tenantId) {
      filtered = filtered.filter((inv) => inv.tenantId === tenantId);
    }

    if (status) {
      filtered = filtered.filter((inv) => inv.status === status);
    }

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const invoices = filtered.slice(skip, skip + limit).map((inv) => ({ ...inv }));

    return { invoices, total };
  }

  async update(
    id: string,
    updates: Partial<InvoiceDocument>,
  ): Promise<InvoiceDocument | null> {
    const current = this.store.invoices.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...updates };
    this.store.invoices.set(id, next);
    return { ...next };
  }

  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const inv of this.store.invoices.values()) {
      if (inv.tenantId !== tenantId) {
        continue;
      }
      counts[inv.status] = (counts[inv.status] ?? 0) + 1;
    }
    return counts;
  }
}

// ── In-Memory Payment Records Repository ────────────────────────────────────

class MemoryPaymentRecordsRepository implements PaymentRecordsRepositoryContract {
  constructor(private readonly store = getMemoryStore()) {}

  async ensureIndexes() {}

  async insert(record: PaymentRecordDocument): Promise<void> {
    this.store.paymentRecords.set(record.paymentRecordId, { ...record });
  }

  async update(
    id: string,
    updates: Partial<PaymentRecordDocument>,
  ): Promise<PaymentRecordDocument | null> {
    const current = this.store.paymentRecords.get(id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...updates };
    this.store.paymentRecords.set(id, next);
    return { ...next };
  }

  async findByClaimId(claimId: string): Promise<PaymentRecordDocument | null> {
    const record = Array.from(this.store.paymentRecords.values()).find(
      (r) => r.claimId === claimId,
    );
    return record ? { ...record } : null;
  }

  async listByTenant(tenantId: string): Promise<PaymentRecordDocument[]> {
    return Array.from(this.store.paymentRecords.values())
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  }

  async listByStatus(status: PaymentRecordDocument["status"]): Promise<PaymentRecordDocument[]> {
    return Array.from(this.store.paymentRecords.values())
      .filter((r) => r.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  }
}

export async function getMemoryRepositoryContext(): Promise<RepositoryContext> {
  if (!memoryRepositoryContext) {
    memoryRepositoryContext = {
      tenants: new MemoryTenantsRepository(),
      runtimeConfigs: new MemoryRuntimeConfigsRepository(),
      scannerVersions: new MemoryScannerVersionsRepository(),
      attributeTemplateVersions: new MemoryAttributeTemplateVersionsRepository(),
      responses: new MemoryResponsesRepository(),
      snapshots: new MemorySnapshotsRepository(),
      employees: new MemoryEmployeesRepository(),
      reimbursements: new MemoryReimbursementsRepository(),
      campaigns: new MemoryCampaignsRepository(),
      invitations: new MemoryInvitationsRepository(),
      budgets: new MemoryBudgetsRepository(),
      budgetHistory: new MemoryBudgetHistoryRepository(),
      notifications: new MemoryNotificationsRepository(),
      claimMessages: new MemoryClaimMessagesRepository(),
      claimRequests: new MemoryClaimRequestsRepository(),
      invoices: new MemoryInvoicesRepository(),
      paymentRecords: new MemoryPaymentRecordsRepository(),
      clinicUsers: new MemoryClinicUsersRepository(),
      clinics: new MemoryClinicsRepository(),
    };
  }

  ensureSeededMemoryStore(memoryRepositoryContext);

  return memoryRepositoryContext;
}
