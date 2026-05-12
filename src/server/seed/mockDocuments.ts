import type { TenantRuntimeConfig } from "@/runtime/contracts/runtime";
import { mockTenantConfigs } from "@/runtime/mocks/mockTenantRegistry";
import type {
  AttributeTemplateVersionDocument,
  RuntimeConfigDocument,
  ScannerVersionDocument,
  TenantDocument,
} from "@/src/server/db/documents";

interface SeedBundle {
  tenant: TenantDocument;
  runtimeConfig: RuntimeConfigDocument;
  scannerVersion: ScannerVersionDocument;
  attributeTemplateVersion: AttributeTemplateVersionDocument;
}

function toSeedBundle(config: TenantRuntimeConfig): SeedBundle {
  const tenantCreatedAt = config.tenant.createdAt;
  const publishedAt = config.publishedAt;

  return {
    tenant: {
      tenantId: config.tenant.id,
      name: config.tenant.name,
      slug: config.tenant.slug,
      status: config.tenant.status,
      plan: config.tenant.plan,
      branding: config.branding ?? {},
      brandingVersionId: config.versionRefs.brandingVersionId,
      activeRuntimeConfigId: config.runtimeConfigId,
      activeRuntimeConfigPublishedAt: publishedAt,
      createdAt: tenantCreatedAt,
      updatedAt: publishedAt,
    },
    runtimeConfig: {
      runtimeConfigId: config.runtimeConfigId,
      tenantId: config.tenant.id,
      tenantSlug: config.tenant.slug,
      publishedAt,
      isActive: true,
      versionRefs: config.versionRefs,
      branding: config.branding ?? {},
      attributeTemplate: config.attributeTemplate,
      scannerVersion: config.scannerVersion,
      runtimeSettings: config.runtimeSettings,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    },
    scannerVersion: {
      scannerVersionId: config.scannerVersion.id,
      tenantId: config.tenant.id,
      version: config.scannerVersion.version,
      publishedAt: config.scannerVersion.publishedAt,
      isActive: config.scannerVersion.isActive,
      categories: config.scannerVersion.categories,
      followUpTriggers: config.scannerVersion.followUpTriggers,
      createdAt: config.scannerVersion.publishedAt,
      updatedAt: config.scannerVersion.publishedAt,
    },
    attributeTemplateVersion: {
      attributeTemplateVersionId: config.versionRefs.attributeTemplateVersionId,
      tenantId: config.tenant.id,
      version: config.publishedAt.slice(0, 10),
      publishedAt,
      isActive: true,
      attributeTemplate: config.attributeTemplate,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    },
  };
}

export const developmentSeedBundles = [
  mockTenantConfigs.demo,
  mockTenantConfigs["tenant-b"],
  mockTenantConfigs["tenant-c"],
  mockTenantConfigs["tenant-d"],
].map(toSeedBundle);
