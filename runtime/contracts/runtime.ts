import type { RuntimeScannerVersion } from "./scannerVersion";

export interface TenantBrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  faviconUrl?: string;
}

export interface RuntimeAttributeOption {
  id: string;
  label: string;
  value: string;
}

export interface RuntimeLocationOption extends RuntimeAttributeOption {
  streamIds?: string[];
}

export interface RuntimeFunctionOption extends RuntimeAttributeOption {
  streamId?: string;
  streamIds?: string[];
  departmentIds?: string[];
  locationIds?: string[];
}

export interface RuntimeDepartmentOption extends RuntimeAttributeOption {
  streamId?: string;
  streamIds?: string[];
  functionId?: string;
  functionIds?: string[];
  locationIds?: string[];
}

export type RuntimeFixedAttributeKey = "location" | "gender" | "age" | "seniority";

export interface RuntimeFixedAttributeConfig {
  enabled?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export interface RuntimeAttributeTemplate {
  streams: RuntimeAttributeOption[];
  locations: RuntimeLocationOption[];
  functions: RuntimeFunctionOption[];
  departments: RuntimeDepartmentOption[];
  genders?: string[];
  ageGroups?: string[];
  seniorityLevels?: string[];
  fixedAttributes?: Partial<Record<RuntimeFixedAttributeKey, RuntimeFixedAttributeConfig>>;
}

export interface TenantRuntimeConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "inactive" | "suspended";
    plan: "free" | "pro" | "enterprise";
    createdAt: string;
  };
  branding?: TenantBrandingConfig;
  attributeTemplate: RuntimeAttributeTemplate;
  scannerVersion: RuntimeScannerVersion;
  runtimeSettings: {
    allowAnonymous: boolean;
    requireAuthentication: boolean;
    surveyExpirationDays: number;
    allowMultipleSubmissions: boolean;
    language: "en" | "ar";
    featureFlags: Record<string, boolean>;
  };
}
