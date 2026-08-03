import { ClinicClaimDetail } from "@/src/modules/clinic-portal/components/ClinicClaimDetail";

export const dynamic = "force-dynamic";

export default async function ClinicClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClinicClaimDetail claimId={id} />;
}
