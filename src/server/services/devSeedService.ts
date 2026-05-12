import { developmentSeedBundles } from "@/src/server/seed/mockDocuments";
import { getRepositoryContext } from "@/src/server/repositories/context";

let seedPromise: Promise<void> | null = null;

export async function ensureDevelopmentSeedData() {
  if (process.env.NODE_ENV === "production" || !process.env.MONGODB_URI) {
    return;
  }

  if (!seedPromise) {
    seedPromise = (async () => {
      const repositories = await getRepositoryContext();

      for (const bundle of developmentSeedBundles) {
        await repositories.tenants.upsertSeed(bundle.tenant);
        await repositories.runtimeConfigs.upsertSeed(bundle.runtimeConfig);
        await repositories.scannerVersions.upsertSeed(bundle.scannerVersion);
        await repositories.attributeTemplateVersions.upsertSeed(
          bundle.attributeTemplateVersion,
        );
      }
    })();
  }

  await seedPromise;
}
