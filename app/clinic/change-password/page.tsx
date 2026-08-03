import { requireClinicPortalUser } from "@/src/modules/clinic-portal/guards/require-clinic-user";
import { ClinicChangePasswordForm } from "@/src/modules/clinic-portal/components/ClinicChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ClinicChangePasswordPage() {
  const context = await requireClinicPortalUser({ allowPasswordChange: true });

  return (
    <ClinicChangePasswordForm
      forced={context.user.mustChangePassword}
      email={context.user.email}
    />
  );
}
