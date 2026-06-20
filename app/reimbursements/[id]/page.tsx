import ReimbursementDetailPage from "@/components/reimbursements/ReimbursementDetailPage";

export default async function ReimbursementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReimbursementDetailPage reimbursementId={id} />;
}
