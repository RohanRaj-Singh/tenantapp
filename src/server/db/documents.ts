import type {
  DashboardAggregationSnapshot,
  DashboardSnapshotFilters,
} from "@/runtime/contracts/aggregation";
import type {
  RuntimeAttributeTemplate,
  RuntimeVersionRefs,
  TenantBrandingConfig,
  TenantRuntimeConfig,
} from "@/runtime/contracts/runtime";
import type {
  RuntimeScannerVersion,
  ScannerQuestion,
} from "@/runtime/contracts/scannerVersion";
import type {
  SurveySubmission,
  SurveySubmissionAttributes,
  SurveySubmissionResponse,
} from "@/runtime/contracts/surveySubmission";

export const COLLECTION_NAMES = {
  tenants: "tenants",
  runtimeConfigs: "runtimeConfigs",
  scannerVersions: "scannerVersions",
  attributeTemplateVersions: "attributeTemplateVersions",
  rawResponses: "rawResponses",
  aggregationSnapshots: "aggregationSnapshots",
} as const;

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

export interface TenantDocument extends TimestampFields {
  tenantId: string;
  name: string;
  slug: string;
  subdomain?: string;
  status: TenantRuntimeConfig["tenant"]["status"];
  plan: TenantRuntimeConfig["tenant"]["plan"];
  branding: TenantBrandingConfig;
  brandingVersionId: string;
  activeRuntimeConfigId: string;
  activeRuntimeConfigPublishedAt: string;
}

export interface RuntimeConfigDocument extends TimestampFields {
  runtimeConfigId: string;
  tenantId: string;
  tenantSlug: string;
  tenantSubdomain?: string;
  publishedAt: string;
  isActive: boolean;
  versionRefs: RuntimeVersionRefs;
  branding: TenantBrandingConfig;
  attributeTemplate: RuntimeAttributeTemplate;
  scannerVersion: RuntimeScannerVersion;
  runtimeSettings: TenantRuntimeConfig["runtimeSettings"];
}

export interface ScannerVersionDocument extends TimestampFields {
  scannerVersionId: string;
  tenantId: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  categories: RuntimeScannerVersion["categories"];
  followUpTriggers: RuntimeScannerVersion["followUpTriggers"];
}

export interface AttributeTemplateVersionDocument extends TimestampFields {
  attributeTemplateVersionId: string;
  tenantId: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  attributeTemplate: RuntimeAttributeTemplate;
}

export interface RawResponseRow extends SurveySubmissionResponse {
  questionKind: ScannerQuestion["kind"];
  categoryId: string;
  categoryLabel: string;
  subdomainId: string;
  subdomainLabel: string;
  triggerQuestionId?: string;
}

export interface RawResponseDocument extends TimestampFields {
  submissionId: string;
  submittedAt: string;
  tenantId: string;
  tenantSlug: string;
  runtimeConfigId: string;
  versionRefs: RuntimeVersionRefs;
  attributes: SurveySubmissionAttributes;
  responses: RawResponseRow[];
  completionState: SurveySubmission["completionState"];
  metadata: SurveySubmission["metadata"];
}

export interface AggregationSnapshotDocument
  extends DashboardAggregationSnapshot,
    TimestampFields {}

export type DashboardFilterKey = keyof DashboardSnapshotFilters;
