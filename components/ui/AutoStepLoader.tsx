"use client";

import { Loader2 } from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

export default function AutoStepLoader() {
  const theme = useTheme();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.primaryColor }} />
      <p className="mt-4 text-sm text-gray-600">Loading dashboard data...</p>
    </div>
  );
}
