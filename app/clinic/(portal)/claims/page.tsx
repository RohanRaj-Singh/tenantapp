import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { ClinicClaimsList } from "@/src/modules/clinic-portal/components/ClinicClaimsList";

export const dynamic = "force-dynamic";

export default function ClinicClaimsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Claims</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reimbursement claims submitted for your clinic.
          </p>
        </div>
        <Link
          href="/clinic/claims/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          <PlusCircle className="h-4 w-4" />
          New claim
        </Link>
      </div>
      <ClinicClaimsList />
    </div>
  );
}
