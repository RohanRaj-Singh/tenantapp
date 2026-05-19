import type { RuntimeAttributeTemplate, RuntimeVersionRefs, TenantRuntimeConfig } from "../contracts/runtime";
import {
  DEFAULT_RUNTIME_TENANT_SLUG,
  RUNTIME_TENANT_QUERY_PARAM,
  RUNTIME_TENANT_STORAGE_KEY,
  normalizeTenantSlug,
} from "../tenant/tenantResolution";
import { mockRuntimeConfig as tenantABaseConfig } from "./mockRuntimeConfig";
import {
  tenantBScannerVersion,
  tenantCScannerVersion,
  tenantDScannerVersion,
} from "./mockScannerCatalog";

export const DEFAULT_MOCK_TENANT_SLUG = DEFAULT_RUNTIME_TENANT_SLUG;
export const MOCK_TENANT_QUERY_PARAM = RUNTIME_TENANT_QUERY_PARAM;
export const MOCK_TENANT_STORAGE_KEY = RUNTIME_TENANT_STORAGE_KEY;

function createVersionRefs(
  tenantKey: string,
  scannerVersionId: string,
): RuntimeVersionRefs {
  return {
    scannerVersionId,
    attributeTemplateVersionId: `attrtpl_${tenantKey}_20260510_001`,
    calculationVersionId: "calc_runtime_placeholder_v1",
    brandingVersionId: `brand_${tenantKey}_20260510_001`,
  };
}

const tenantBAttributeTemplate: RuntimeAttributeTemplate = {
  streams: [
    { id: "stream-clinical", label: "Clinical Services", value: "clinical_services" },
    { id: "stream-support", label: "Shared Services", value: "shared_services" },
  ],
  locations: [
    {
      id: "loc-clinical-central",
      label: "Central Campus",
      value: "central_campus_clinical",
      streamId: "stream-clinical",
    },
    {
      id: "loc-clinical-field",
      label: "Field Teams",
      value: "field_teams",
      streamId: "stream-clinical",
    },
    {
      id: "loc-support-central",
      label: "Central Campus Support",
      value: "central_campus_support",
      streamId: "stream-support",
    },
    {
      id: "loc-support-west",
      label: "West Annex",
      value: "west_annex",
      streamId: "stream-support",
    },
  ],
  functions: [
    {
      id: "func-care-delivery-central",
      label: "Care Delivery",
      value: "care_delivery_central",
      locationId: "loc-clinical-central",
    },
    {
      id: "func-care-delivery-field",
      label: "Care Delivery",
      value: "care_delivery_field",
      locationId: "loc-clinical-field",
    },
    {
      id: "func-care-operations",
      label: "Care Operations",
      value: "care_operations",
      locationId: "loc-clinical-central",
    },
    {
      id: "func-people-operations",
      label: "People Operations",
      value: "people_operations",
      locationId: "loc-support-central",
    },
    {
      id: "func-service-desk",
      label: "Service Desk",
      value: "service_desk",
      locationId: "loc-support-west",
    },
  ],
  departments: [
    {
      id: "dept-patient-services",
      label: "Patient Services",
      value: "patient_services",
      functionId: "func-care-delivery-central",
    },
    {
      id: "dept-clinical-operations",
      label: "Clinical Operations",
      value: "clinical_operations",
      functionId: "func-care-delivery-central",
    },
    {
      id: "dept-community-outreach",
      label: "Community Outreach",
      value: "community_outreach",
      functionId: "func-care-delivery-field",
    },
    {
      id: "dept-mobile-care",
      label: "Mobile Care",
      value: "mobile_care",
      functionId: "func-care-delivery-field",
    },
    {
      id: "dept-staffing",
      label: "Staffing",
      value: "staffing",
      functionId: "func-care-operations",
    },
    {
      id: "dept-capacity-planning",
      label: "Capacity Planning",
      value: "capacity_planning",
      functionId: "func-care-operations",
    },
    {
      id: "dept-people-partnering",
      label: "People Partnering",
      value: "people_partnering",
      functionId: "func-people-operations",
    },
    {
      id: "dept-shared-services",
      label: "Shared Services",
      value: "shared_services_department",
      functionId: "func-people-operations",
    },
    {
      id: "dept-helpdesk",
      label: "Helpdesk",
      value: "helpdesk",
      functionId: "func-service-desk",
    },
    {
      id: "dept-endpoint-support",
      label: "Endpoint Support",
      value: "endpoint_support",
      functionId: "func-service-desk",
    },
  ],
  genders: ["female", "male", "non_binary"],
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
      id: "loc-advisory-virtual",
      label: "Virtual Advisory Team",
      value: "virtual_advisory_team",
      streamId: "stream-advisory",
    },
    {
      id: "loc-delivery-virtual",
      label: "Virtual Delivery Team",
      value: "virtual_delivery_team",
      streamId: "stream-delivery",
    },
  ],
  functions: [
    { id: "func-advisory", label: "Advisory", value: "advisory", locationId: "loc-advisory-virtual" },
    { id: "func-delivery", label: "Delivery", value: "delivery", locationId: "loc-missing" },
    { id: "func-ghost", label: "Ghost Operations", value: "ghost_operations", locationId: "loc-ghost" },
  ],
  departments: [
    {
      id: "dept-customer-strategy",
      label: "Customer Strategy",
      value: "customer_strategy",
      functionId: "func-advisory",
    },
    {
      id: "dept-misaligned",
      label: "Misaligned Mapping",
      value: "misaligned_mapping",
      functionId: "func-missing",
    },
  ],
  genders: ["female", "male"],
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

const demoConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
};

const tenantAConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
  runtimeConfigId: "runtimecfg_tenanta_20260510_001",
  versionRefs: createVersionRefs("tenanta", tenantABaseConfig.scannerVersion.id),
  tenant: {
    ...tenantABaseConfig.tenant,
    id: "tenant-remedygcc-a",
    name: "RemedyGCC Energy Alliance",
    slug: "tenant-a",
  },
};

const tenantBConfig: TenantRuntimeConfig = {
  ...tenantABaseConfig,
  runtimeConfigId: "runtimecfg_tenantb_20260510_001",
  versionRefs: createVersionRefs("tenantb", tenantBScannerVersion.id),
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
  runtimeConfigId: "runtimecfg_tenantc_20260510_001",
  versionRefs: createVersionRefs("tenantc", tenantCScannerVersion.id),
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
  runtimeConfigId: "runtimecfg_tenantd_20260510_001",
  versionRefs: createVersionRefs("tenantd", tenantDScannerVersion.id),
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
  demo: demoConfig,
  "tenant-a": tenantAConfig,
  "tenant-b": tenantBConfig,
  "tenant-c": tenantCConfig,
  "tenant-d": tenantDConfig,
} satisfies Record<string, TenantRuntimeConfig>;

export type MockTenantSlug = keyof typeof mockTenantConfigs;

export function resolveMockTenantSlug(slug?: string | null): MockTenantSlug {
  const normalizedSlug = normalizeTenantSlug(slug);

  if (normalizedSlug in mockTenantConfigs) {
    return normalizedSlug as MockTenantSlug;
  }

  return DEFAULT_MOCK_TENANT_SLUG;
}

export function getMockTenantConfig(slug?: string | null): TenantRuntimeConfig {
  return mockTenantConfigs[resolveMockTenantSlug(slug)];
}
