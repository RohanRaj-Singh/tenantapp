import type {
  AggregationSnapshotDocument,
  AttributeTemplateVersionDocument,
  RawResponseDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";

interface MemoryStore {
  tenants: Map<string, TenantDocument>;
  runtimeConfigs: Map<string, RuntimeConfigDocument>;
  scannerVersions: Map<string, ScannerVersionDocument>;
  attributeTemplateVersions: Map<string, AttributeTemplateVersionDocument>;
  rawResponses: RawResponseDocument[];
  aggregationSnapshots: AggregationSnapshotDocument[];
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
  };
}

export function getMemoryStore() {
  if (!global.__remedygccMemoryStore__) {
    global.__remedygccMemoryStore__ = createMemoryStore();
  }

  return global.__remedygccMemoryStore__;
}
