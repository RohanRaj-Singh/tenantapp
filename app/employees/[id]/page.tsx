import EmployeeDetailPage from "@/components/employees/EmployeeDetailPage";

export default async function EmployeeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetailPage employeeId={id} />;
}
