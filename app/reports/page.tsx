import { Construction } from "lucide-react";

export default async function ReportsPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Construction className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-slate-900">Coming Soon</h2>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          Reporting features will be available in a future update.
        </p>
      </div>
    </div>
  );
}
