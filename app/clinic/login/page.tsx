import { redirect } from "next/navigation";
import { getCurrentClinicAuthValidation } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import {
  CLINIC_CHANGE_PASSWORD_PATH,
  CLINIC_CLAIMS_PATH,
} from "@/src/modules/clinic-portal/guards/require-clinic-user";
import { ClinicLoginForm } from "@/src/modules/clinic-portal/components/ClinicLoginForm";

export const dynamic = "force-dynamic";

export default async function ClinicLoginPage() {
  const validation = await getCurrentClinicAuthValidation();
  if (validation.success && validation.context) {
    redirect(
      validation.context.user.mustChangePassword
        ? CLINIC_CHANGE_PASSWORD_PATH
        : CLINIC_CLAIMS_PATH,
    );
  }

  return <ClinicLoginForm />;
}
