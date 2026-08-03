import { redirect } from "next/navigation";
import { CLINIC_CLAIMS_PATH } from "@/src/modules/clinic-portal/guards/require-clinic-user";

export const dynamic = "force-dynamic";

export default function ClinicIndexPage() {
  redirect(CLINIC_CLAIMS_PATH);
}
