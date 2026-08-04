/**
 * Shared clinic-portal claim types + presentation helpers.
 *
 * The clinic view is anonymized server-side (`stripPiiForClinic`): claims never
 * carry the employee name, bank details, or contact number — only `employeeCode`.
 */

export interface ClinicClaim {
  reimbursementId: string;
  claimNumber?: string;
  tenantId: string;
  employeeCode: string | null;
  amount: number;
  description: string;
  clinicId?: string;
  clinicName?: string;
  receiptUrl?: string;
  serviceDate?: string;
  sessionCount?: number;
  sessionTypes?: string[];
  sessionFor?: string;
  status: string;
  history?: Array<{
    status: string;
    actorRole: string;
    note?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const CLINIC_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  frozen: { label: "Frozen", className: "bg-sky-50 text-sky-700 border-sky-200" },
  approved: { label: "Approved", className: "bg-green-50 text-green-700 border-green-200" },
  to_be_paid: { label: "Awaiting Payout", className: "bg-orange-50 text-orange-700 border-orange-200" },
  paid: { label: "Paid", className: "bg-purple-50 text-purple-700 border-purple-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
};

export function clinicStatusStyle(status: string) {
  return (
    CLINIC_STATUS_STYLES[status] ?? {
      label: status,
      className: "bg-slate-50 text-slate-600 border-slate-200",
    }
  );
}

export function formatClinicAmount(amount: number): string {
  return `OMR ${amount.toFixed(3)}`;
}

export function formatClinicDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatClinicDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
