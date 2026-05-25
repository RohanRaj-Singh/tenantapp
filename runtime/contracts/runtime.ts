import type { RuntimeScannerVersion } from "./scannerVersion";

export interface TenantBrandingConfig {
  logo?: string;
  backgroundImage?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  faviconUrl?: string;
}

export interface TenantContentText {
  en?: string;
  ar?: string;
}

export interface TenantContentConfig {
  pages?: {
    about?: {
      intro?: TenantContentText;
    };
  };
}

export interface RuntimeVersionRefs {
  scannerVersionId: string;
  attributeTemplateVersionId: string;
  calculationVersionId: string;
  brandingVersionId: string;
}

export interface RuntimeAttributeOption {
  id: string;
  label: string;
  value: string;
}

export interface RuntimeLocationOption extends RuntimeAttributeOption {
  streamId: string;
}

export interface RuntimeFunctionOption extends RuntimeAttributeOption {
  locationId: string;
}

export interface RuntimeDepartmentOption extends RuntimeAttributeOption {
  functionId: string;
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
  runtimeConfigId: string;
  publishedAt: string;
  versionRefs: RuntimeVersionRefs;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "inactive" | "suspended" | "disabled" | "archived";
    plan: "free" | "pro" | "enterprise";
    createdAt: string;
  };
  branding?: TenantBrandingConfig;
  content?: TenantContentConfig;
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
