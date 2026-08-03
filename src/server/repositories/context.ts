import { getMongoDb } from "@/src/server/db/mongodb";
import { ApiError } from "@/src/server/api/errors";
import {
  INDIVIDUAL_TENANT_ID,
  INDIVIDUAL_TENANT_NAME,
  INDIVIDUAL_TENANT_SLUG,
} from "@/src/server/constants/individual";
import { AttributeTemplateVersionsRepository } from "./attributeTemplateVersionsRepository";
import { BudgetHistoryRepository } from "./budgetHistoryRepository";
import { BudgetsRepository } from "./budgetsRepository";
import { ClaimMessagesRepository } from "./claimMessagesRepository";
import { ClaimRequestsRepository } from "./claimRequestsRepository";
import { CampaignsRepository } from "./campaignsRepository";
import { ClinicsRepository } from "./clinicsRepository";
import { ClinicUsersRepository } from "./clinicUsersRepository";
import type { RepositoryContext } from "./contracts";
import { EmployeesRepository } from "./employeesRepository";
import { InvitationsRepository } from "./invitationsRepository";
import { InvoicesRepository } from "./invoicesRepository";
import { getMemoryRepositoryContext } from "./memoryRepositoryContext";
import { NotificationsRepository } from "./notificationsRepository";
import { PaymentRecordsRepository } from "./paymentRecordsRepository";
import { ReimbursementsRepository } from "./reimbursementsRepository";
import { ResponsesRepository } from "./responsesRepository";
import { RuntimeConfigsRepository } from "./runtimeConfigsRepository";
import { ScannerVersionsRepository } from "./scannerVersionsRepository";
import { SnapshotsRepository } from "./snapshotsRepository";
import { TenantsRepository } from "./tenantsRepository";

let indexesPromise: Promise<void> | null = null;
let mongoRepositoryContext: RepositoryContext | null = null;

async function getMongoRepositoryContext(): Promise<RepositoryContext> {
  const db = await getMongoDb();

  if (!mongoRepositoryContext) {
    mongoRepositoryContext = {
      tenants: new TenantsRepository(db),
      runtimeConfigs: new RuntimeConfigsRepository(db),
      scannerVersions: new ScannerVersionsRepository(db),
      attributeTemplateVersions: new AttributeTemplateVersionsRepository(db),
      responses: new ResponsesRepository(db),
      snapshots: new SnapshotsRepository(db),
      employees: new EmployeesRepository(db),
      reimbursements: new ReimbursementsRepository(db),
      campaigns: new CampaignsRepository(db),
      invitations: new InvitationsRepository(db),
      budgets: new BudgetsRepository(db),
      budgetHistory: new BudgetHistoryRepository(db),
      notifications: new NotificationsRepository(db),
      claimMessages: new ClaimMessagesRepository(db),
      claimRequests: new ClaimRequestsRepository(db),
      invoices: new InvoicesRepository(db),
      paymentRecords: new PaymentRecordsRepository(db),
      clinicUsers: new ClinicUsersRepository(db),
      clinics: new ClinicsRepository(db),
    };
  }

  if (!indexesPromise) {
    // Index bootstrap is best-effort: a stale/legacy collection (e.g. an old
    // `clinics` schema whose documents predate the `clinicId` rename) must not
    // abort the whole Mongo context — otherwise `getRepositoryContext()` would
    // silently fall back to the in-memory store and all real data would vanish.
    // Failures are logged and the store is still usable.
    const indexJobs = [
      mongoRepositoryContext.tenants.ensureIndexes(),
      mongoRepositoryContext.runtimeConfigs.ensureIndexes(),
      mongoRepositoryContext.scannerVersions.ensureIndexes(),
      mongoRepositoryContext.attributeTemplateVersions.ensureIndexes(),
      mongoRepositoryContext.responses.ensureIndexes(),
      mongoRepositoryContext.snapshots.ensureIndexes(),
      mongoRepositoryContext.employees.ensureIndexes(),
      mongoRepositoryContext.reimbursements.ensureIndexes(),
      mongoRepositoryContext.campaigns.ensureIndexes(),
      mongoRepositoryContext.budgets.ensureIndexes(),
      mongoRepositoryContext.budgetHistory.ensureIndexes(),
      mongoRepositoryContext.notifications.ensureIndexes(),
      mongoRepositoryContext.claimMessages.ensureIndexes(),
      mongoRepositoryContext.claimRequests.ensureIndexes(),
      mongoRepositoryContext.invoices.ensureIndexes(),
      mongoRepositoryContext.paymentRecords.ensureIndexes(),
      mongoRepositoryContext.clinicUsers.ensureIndexes(),
      mongoRepositoryContext.clinics.ensureIndexes(),
    ];
    indexesPromise = Promise.all(
      indexJobs.map((job) =>
        job.catch((error) => {
          console.error("[repositories] ensureIndexes failed (non-fatal):", (error as Error).message);
        }),
      ),
    ).then(() => undefined);
  }

  await indexesPromise;

  await ensureIndividualTenantSeed(mongoRepositoryContext);

  return mongoRepositoryContext;
}

let individualTenantSeedPromise: Promise<void> | null = null;

/**
 * Idempotently ensures the reserved "Individual Members" tenant exists so that
 * public / individual sign-ups (FR-079, FR-082) — modelled as employees of this
 * tenant — have a valid tenant to attach to. Cached per process.
 */
async function ensureIndividualTenantSeed(context: RepositoryContext): Promise<void> {
  if (!individualTenantSeedPromise) {
    individualTenantSeedPromise = (async () => {
      const existing = await context.tenants.findByTenantId(INDIVIDUAL_TENANT_ID);
      if (existing) return;

      const nowIso = new Date().toISOString();
      await context.tenants.upsertSeed({
        tenantId: INDIVIDUAL_TENANT_ID,
        name: INDIVIDUAL_TENANT_NAME,
        slug: INDIVIDUAL_TENANT_SLUG,
        status: "active",
        plan: "pro",
        branding: {},
        brandingVersionId: `brand_${INDIVIDUAL_TENANT_SLUG}`,
        activeRuntimeConfigId: `runtime_${INDIVIDUAL_TENANT_SLUG}`,
        activeRuntimeConfigPublishedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    })();
  }

  await individualTenantSeedPromise;
}

export async function getRepositoryContext(): Promise<RepositoryContext> {
  const shouldAllowDevelopmentFallback = process.env.NODE_ENV !== "production";

  if (!process.env.MONGODB_URI) {
    if (shouldAllowDevelopmentFallback) {
      return getMemoryRepositoryContext();
    }

    throw new ApiError(
      503,
      "MONGODB_NOT_CONFIGURED",
      "MONGODB_URI is not configured for the current environment.",
    );
  }

  try {
    return await getMongoRepositoryContext();
  } catch (error) {
    if (shouldAllowDevelopmentFallback) {
      return getMemoryRepositoryContext();
    }

    throw error;
  }
}
