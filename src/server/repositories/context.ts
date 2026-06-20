import { getMongoDb } from "@/src/server/db/mongodb";
import { ApiError } from "@/src/server/api/errors";
import { AttributeTemplateVersionsRepository } from "./attributeTemplateVersionsRepository";
import type { RepositoryContext } from "./contracts";
import { EmployeesRepository } from "./employeesRepository";
import { getMemoryRepositoryContext } from "./memoryRepositoryContext";
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
    };
  }

  if (!indexesPromise) {
    indexesPromise = Promise.all([
      mongoRepositoryContext.tenants.ensureIndexes(),
      mongoRepositoryContext.runtimeConfigs.ensureIndexes(),
      mongoRepositoryContext.scannerVersions.ensureIndexes(),
      mongoRepositoryContext.attributeTemplateVersions.ensureIndexes(),
      mongoRepositoryContext.responses.ensureIndexes(),
      mongoRepositoryContext.snapshots.ensureIndexes(),
      mongoRepositoryContext.employees.ensureIndexes(),
      mongoRepositoryContext.reimbursements.ensureIndexes(),
    ]).then(() => undefined);
  }

  await indexesPromise;

  return mongoRepositoryContext;
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
