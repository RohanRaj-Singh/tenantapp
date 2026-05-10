import type { RuntimeAttributeTemplate, TenantRuntimeConfig } from "../contracts/runtime";
import { mockRuntimeConfig as tenantABaseConfig } from "./mockRuntimeConfig";
import {
  tenantBScannerVersion,
  tenantCScannerVersion,
  tenantDScannerVersion,
} from "./mockScannerCatalog";

export const DEFAULT_MOCK_TENANT_SLUG = "tenant-a";
export const MOCK_TENANT_QUERY_PARAM = "tenant";
export const MOCK_TENANT_STORAGE_KEY = "remedygcc-active-tenant";

const tenantBAttributeTemplate: RuntimeAttributeTemplate = {
  streams: [
    { id: "stream-clinical", label: "Clinical Services", value: "clinical_services" },
    { id: "stream-support", label: "Shared Services", value: "shared_services" },
  ],
  locations: [
    {
      id: "loc-central-campus",
      label: "Central Campus",
      value: "central_campus",
      streamIds: ["stream-clinical", "stream-support"],
    },
    {
      id: "loc-west-annex",
      label: "West Annex",
      value: "west_annex",
      streamIds: ["stream-support"],
    },
    {
      id: "loc-field-teams",
      label: "Field Teams",
      value: "field_teams",
      streamIds: ["stream-clinical"],
    },
  ],
  functions: [
    {
      id: "func-care-delivery",
      label: "Care Delivery",
      value: "care_delivery",
      streamIds: ["stream-clinical"],
      locationIds: ["loc-central-campus", "loc-field-teams"],
      departmentIds: ["dept-patient-services", "dept-community-outreach"],
    },
    {
      id: "func-care-operations",
      label: "Care Operations",
      value: "care_operations",
      streamIds: ["stream-clinical", "stream-support"],
      locationIds: ["loc-central-campus"],
      departmentIds: ["dept-patient-services", "dept-staffing"],
    },
    {
      id: "func-people-operations",
      label: "People Operations",
      value: "people_operations",
      streamIds: ["stream-support"],
      locationIds: ["loc-central-campus", "loc-west-annex"],
      departmentIds: ["dept-staffing", "dept-shared-services"],
    },
    {
      id: "func-service-desk",
      label: "Service Desk",
      value: "service_desk",
      streamIds: ["stream-support"],
      locationIds: ["loc-west-annex"],
      departmentIds: ["dept-shared-services"],
    },
  ],
  departments: [
    {
      id: "dept-patient-services",
      label: "Patient Services",
      value: "patient_services",
      streamIds: ["stream-clinical"],
      functionIds: ["func-care-delivery", "func-care-operations"],
      locationIds: ["loc-central-campus", "loc-field-teams"],
    },
    {
      id: "dept-community-outreach",
      label: "Community Outreach",
      value: "community_outreach",
      streamIds: ["stream-clinical"],
      functionIds: ["func-care-delivery"],
      locationIds: ["loc-field-teams"],
    },
    {
      id: "dept-staffing",
      label: "Staffing",
      value: "staffing",
      streamIds: ["stream-clinical", "stream-support"],
      functionIds: ["func-care-operations", "func-people-operations"],
      locationIds: ["loc-central-campus"],
    },
    {
      id: "dept-shared-services",
      label: "Shared Services",
      value: "shared_services_department",
      streamIds: ["stream-support"],
      functionIds: ["func-people-operations", "func-service-desk"],
      locationIds: ["loc-central-campus", "loc-west-annex"],
    },
  ],
  genders: ["female", "male", "non_binary", "prefer_not_to_say"],
  ageGroups: ["18-24", "25-34", "35-44", "45-54", "55+"],
  seniorityLevels: [],
  fixedAttributes: {
    location: {
      label: "Site",
      placeholder: "Select your site",
    },
    seniority: {
      enabled: false,
      required: false,
    },
  },
};

const tenantCAttributeTemplate: RuntimeAttributeTemplate = {
  streams: [
    { id: "stream-advisory", label: "Advisory", value: "advisory" },
    { id: "stream-delivery", label: "Delivery", value: "delivery" },
  ],
  locations: [
    {
      id: "loc-virtual",
      label: "Virtual Team",
      value: "virtual_team",
      streamIds: ["stream-advisory", "stream-delivery"],
    },
  ],
  functions: [
    { id: "func-advisory", label: "Advisory", value: "advisory", streamId: "stream-advisory" },
    { id: "func-delivery", label: "Delivery", value: "delivery", streamId: "stream-delivery" },
    { id: "func-ghost", label: "Ghost Operations", value: "ghost_operations", streamId: "stream-missing" },
  ],
  departments: [
    {
      id: "dept-customer-strategy",
      label: "Customer Strategy",
      value: "customer_strategy",
      streamId: "stream-advisory",
      functionId: "func-advisory",
    },
    {
      id: "dept-misaligned",
      label: "Misaligned Mapping",
      value: "misaligned_mapping",
      streamId: "stream-delivery",
      functionId: "func-missing",
    },
  ],
  genders: ["prefer_not_to_say"],
  ageGroups: ["25-34", "35-44"],
  seniorityLevels: [],
  fixedAttributes: {
    seniority: {
      enabled: false,
      required: false,
    },
  },
};

const tenantDAttributeTemplate: RuntimeAttributeTemplate = {
  streams: [],
  locations: [],
  functions: [],
  departments: [],
  genders: ["female", "male"],
  ageGroups: ["25-34"],
  seniorityLevels: ["employee"],
  fixedAttributes: {
    location: {
      enabled: false,
      required: false,
    },
  },
};

const tenantAConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
};

const tenantBConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
  tenant: {
    ...tenantABaseConfig.tenant,
    id: "tenant-remedygcc-b",
    name: "Northern Horizon Occupational Wellbeing Alliance",
    slug: "tenant-b",
    plan: "pro",
  },
  branding: {
    primaryColor: "#1d4ed8",
    logoUrl: "/images/logo.png",
  },
  attributeTemplate: tenantBAttributeTemplate,
  scannerVersion: tenantBScannerVersion,
};

const { branding: _omittedBranding, ...tenantCBaseConfig } = tenantABaseConfig;

const tenantCConfig: TenantRuntimeConfig = {
  ...tenantCBaseConfig,
  tenant: {
    ...tenantABaseConfig.tenant,
    id: "tenant-remedygcc-c",
    name: "RemedyGCC Fallback Validation Tenant",
    slug: "tenant-c",
    plan: "free",
  },
  attributeTemplate: tenantCAttributeTemplate,
  scannerVersion: tenantCScannerVersion,
};

const tenantDConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
  tenant: {
    ...tenantABaseConfig.tenant,
    id: "tenant-remedygcc-d",
    name: "RemedyGCC Empty Hierarchy Tenant",
    slug: "tenant-d",
    plan: "free",
  },
  branding: {
    logoUrl: "/images/logo.png",
    primaryColor: "#9a3412",
  },
  attributeTemplate: tenantDAttributeTemplate,
  scannerVersion: tenantDScannerVersion,
};

export const mockTenantConfigs = {
  "tenant-a": tenantAConfig,
  "tenant-b": tenantBConfig,
  "tenant-c": tenantCConfig,
  "tenant-d": tenantDConfig,
} satisfies Record<string, TenantRuntimeConfig>;

export type MockTenantSlug = keyof typeof mockTenantConfigs;

export function resolveMockTenantSlug(slug?: string | null): MockTenantSlug {
  if (!slug) {
    return DEFAULT_MOCK_TENANT_SLUG;
  }

  const normalizedSlug = slug.trim().toLowerCase();

  if (normalizedSlug in mockTenantConfigs) {
    return normalizedSlug as MockTenantSlug;
  }

  return DEFAULT_MOCK_TENANT_SLUG;
}

export function getMockTenantConfig(slug?: string | null): TenantRuntimeConfig {
  return mockTenantConfigs[resolveMockTenantSlug(slug)];
}
