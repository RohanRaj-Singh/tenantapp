import { TenantPasswordForm } from "@/src/modules/tenant-auth/components/TenantPasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <TenantPasswordForm
        title="Change password"
        description="Use your current password to set a new dashboard password before continuing."
        submitLabel="Update Password"
      />
    </div>
  );
}
