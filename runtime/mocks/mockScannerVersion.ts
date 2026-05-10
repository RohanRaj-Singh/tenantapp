import type { ScannerVersion } from "../contracts/scannerVersion";
import { tenantAScannerVersion } from "./mockScannerCatalog";

export const mockScannerVersion: ScannerVersion = {
  scannerVersion: {
    id: tenantAScannerVersion.id,
    version: tenantAScannerVersion.version,
    tenantId: "tenant-remedygcc-a",
    publishedAt: tenantAScannerVersion.publishedAt,
    createdBy: "system",
    changeLog: "Canonical runtime scanner contract with explicit answer scores.",
  },
  categories: tenantAScannerVersion.categories,
  followUpTriggers: tenantAScannerVersion.followUpTriggers,
};
