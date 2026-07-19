import { redirect } from "next/navigation";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Edit is no longer a separate page — redirect to detail page
  redirect(`/employees/${id}`);
}
