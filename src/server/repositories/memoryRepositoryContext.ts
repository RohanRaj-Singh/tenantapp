import type { DashboardSnapshotFilters } from "@/runtime/contracts/aggregation";
import { developmentSeedBundles } from "@/src/server/seed/mockDocuments";
import { getMemoryStore } from "@/src/server/db/memoryStore";
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
import type {
  AttributeTemplateVersionsRepositoryContract,
  EmployeesRepositoryContract,
  FindEmployeesOptions,
  FindEmployeesResult,
  FindReimbursementsOptions,
  FindReimbursementsResult,
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

  async findByTenantId(
    tenantId: string,
    options: FindEmployeesOptions = {},
  ): Promise<FindEmployeesResult> {
    const { search, status, skip = 0, limit = 20 } = options;

    let filtered = Array.from(this.store.employees.values()).filter(
      (emp) => emp.tenantId === tenantId,
    );

    if (status) {
      filtered = filtered.filter((emp) => emp.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

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
    const { search, status, employeeId, tenantId, skip = 0, limit = 200 } = options;

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

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
}

let seeded = false;
let memoryRepositoryContext: RepositoryContext | null = null;

/** Deterministic scrypt hash for PIN "1234" (salt:hash) for development seeding. */
const DEV_PIN_HASH =
  "00000000000000000000000000000000:bc3b80e6561d9800a24104f89200e0b49cb0179656a03695dfe3f228abee1158d60811508e571300ee105767166c7606b4912a9329993a82745800ed0da61e22";

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
          pinHash: DEV_PIN_HASH,
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

  seeded = true;
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
    };
  }

  ensureSeededMemoryStore(memoryRepositoryContext);

  return memoryRepositoryContext;
}
