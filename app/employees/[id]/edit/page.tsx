import EmployeeFormPage from "@/components/employees/EmployeeFormPage";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeFormPage mode="edit" employeeId={id} />;
}
