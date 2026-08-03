import { getRepositoryContext } from "@/src/server/repositories/context";
import { requireClinicPortalUser } from "@/src/modules/clinic-portal/guards/require-clinic-user";
import { ClinicSubmitClaimForm } from "@/src/modules/clinic-portal/components/ClinicSubmitClaimForm";

export const dynamic = "force-dynamic";

export default async function ClinicNewClaimPage() {
  const context = await requireClinicPortalUser();

  // Resolve the user's clinic + tenant names (the session carries only IDs) so
  // the submit form can offer a meaningful scope selector.
  const repositories = await getRepositoryContext();
  const [clinics, tenants] = await Promise.all([
    Promise.all(
      context.user.clinicIds.map(async (clinicId) => {
        const clinic = await repositories.clinics.findById(clinicId);
        return clinic ? { clinicId, name: clinic.name } : null;
      }),
    ),
    Promise.all(
      context.user.tenantIds.map(async (tenantId) => {
        const tenant = await repositories.tenants.findByTenantId(tenantId);
        return tenant ? { tenantId, name: tenant.name } : null;
      }),
    ),
  ]);

  return (
    <ClinicSubmitClaimForm
      clinics={clinics.filter((entry): entry is NonNullable<typeof entry> => entry !== null)}
      tenants={tenants.filter((entry): entry is NonNullable<typeof entry> => entry !== null)}
    />
  );
}
