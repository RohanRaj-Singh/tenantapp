import { NextResponse } from "next/server";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { INDIVIDUAL_TENANT_ID } from "@/src/server/constants/individual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Curated descriptions for known employee-facing tenants.
 * New tenants added via the super admin will show a generic description.
 */
const TENANT_DESCRIPTIONS: Record<string, string> = {
  "tenant-omantel": "Oman's leading telecommunications provider",
  "tenant-oq": "Integrated energy company",
  "tenant-pdo": "Petroleum Development Oman",
};

/**
 * Returns active tenants that are available for employee-access login.
 * Tenant visibility is controlled by the super admin via tenant status.
 * Only tenants with status "active" appear on the employee portal.
 */
export async function GET() {
  try {
    const repositories = await getRepositoryContext();
    const activeTenants = await repositories.tenants.findAllActive();

    const results = activeTenants
      // The reserved "Individual Members" pool is never a selectable organisation.
      .filter((tenant) => tenant.tenantId !== INDIVIDUAL_TENANT_ID)
      .map((tenant) => ({
        id: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        description: TENANT_DESCRIPTIONS[tenant.tenantId] ?? `${tenant.name} Employee Portal`,
      }));

    return NextResponse.json(results, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to load tenants." },
      { status: 500 },
    );
  }
}
