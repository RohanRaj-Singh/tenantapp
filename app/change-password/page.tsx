import { TenantPasswordForm } from "@/src/modules/tenant-auth/components/TenantPasswordForm";
import { getServerTenantCopy } from "@/runtime/language/server";

export default async function ChangePasswordPage() {
  const copy = await getServerTenantCopy();
  const passwordPageCopy = copy.dashboard.changePasswordPage;
  return (
    <div className="mx-auto max-w-2xl">
      <TenantPasswordForm
        title={passwordPageCopy.title}
        description={passwordPageCopy.description}
        submitLabel={passwordPageCopy.submitLabel}
      />
    </div>
  );
}
