import { TenantRuntimeConfig } from "../contracts/runtime";
import { tenantAScannerVersion } from "./mockScannerCatalog";

export const mockRuntimeConfig: TenantRuntimeConfig = {
  runtimeConfigId: "runtimecfg_demo_20260510_001",
  publishedAt: "2026-05-10T08:00:00.000Z",
  versionRefs: {
    scannerVersionId: tenantAScannerVersion.id,
    attributeTemplateVersionId: "attrtpl_demo_20260510_001",
    calculationVersionId: "calc_demo_placeholder_v1",
    brandingVersionId: "brand_demo_20260510_001",
  },
  tenant: {
    id: "tenant-demo",
    name: "RemedyGCC Demo Tenant",
    slug: "demo",
    status: "active",
    plan: "enterprise",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  branding: {
    logo: "/images/orgLogo.png",
    logoUrl: "/images/orgLogo.png",
    backgroundImage: "/images/banner.png",
    primaryColor: "#0f766e",
    secondaryColor: "#0d9488",
    fontFamily: "Inter, system-ui, sans-serif",
    faviconUrl: "/favicon.ico",
  },
  content: {
    pages: {
      about: {
        intro: {
          en: "Our wellbeing platform helps organizations understand and improve employee experience through data-driven insights.",
        },
      },
    },
  },
  attributeTemplate: {
    streams: [
      { id: "stream-1", label: "Commercial", value: "commercial" },
      { id: "stream-2", label: "Operations", value: "operations" },
      { id: "stream-3", label: "Technology", value: "technology" },
    ],
    locations: [
      { id: "loc-1", label: "Commercial HQ", value: "commercial_hq", streamId: "stream-1" },
      { id: "loc-2", label: "Commercial North", value: "commercial_north", streamId: "stream-1" },
      { id: "loc-3", label: "Operations South", value: "operations_south", streamId: "stream-2" },
      { id: "loc-4", label: "Technology Remote", value: "technology_remote", streamId: "stream-3" },
    ],
    functions: [
      { id: "func-1", label: "Business Development", value: "business_development", locationId: "loc-1" },
      { id: "func-2", label: "Sales", value: "sales", locationId: "loc-2" },
      { id: "func-3", label: "Operations Management", value: "operations_management", locationId: "loc-3" },
      { id: "func-4", label: "Quality Assurance", value: "quality_assurance", locationId: "loc-3" },
      { id: "func-5", label: "Software Development", value: "software_development", locationId: "loc-4" },
      { id: "func-6", label: "IT Support", value: "it_support", locationId: "loc-4" },
    ],
    departments: [
      { id: "dept-1", label: "Strategic Partnerships", value: "strategic_partnerships", functionId: "func-1" },
      { id: "dept-2", label: "Account Growth", value: "account_growth", functionId: "func-1" },
      { id: "dept-3", label: "Enterprise Sales", value: "enterprise_sales", functionId: "func-2" },
      { id: "dept-4", label: "Channel Sales", value: "channel_sales", functionId: "func-2" },
      { id: "dept-5", label: "Process Excellence", value: "process_excellence", functionId: "func-3" },
      { id: "dept-6", label: "Site Coordination", value: "site_coordination", functionId: "func-3" },
      { id: "dept-7", label: "Compliance Controls", value: "compliance_controls", functionId: "func-4" },
      { id: "dept-8", label: "Audit Readiness", value: "audit_readiness", functionId: "func-4" },
      { id: "dept-9", label: "Frontend Development", value: "frontend_development", functionId: "func-5" },
      { id: "dept-10", label: "Backend Development", value: "backend_development", functionId: "func-5" },
      { id: "dept-11", label: "Helpdesk", value: "helpdesk", functionId: "func-6" },
      { id: "dept-12", label: "Infrastructure", value: "infrastructure", functionId: "func-6" },
    ],
    genders: ["male", "female"],
    ageGroups: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    seniorityLevels: ["intern", "employee", "senior", "manager", "director", "vp", "c_suite"],
  },
  scannerVersion: tenantAScannerVersion,
  runtimeSettings: {
    allowAnonymous: true,
    requireAuthentication: false,
    surveyExpirationDays: 30,
    allowMultipleSubmissions: false,
    language: "en",
    featureFlags: {
      enableFollowUps: true,
      enableRiskAnalysis: true,
    },
  },
};
