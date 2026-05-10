"use client";

import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

export default function TestPage() {
  const theme = useTheme();

  return (
    <div className="tenant-page-shell min-h-screen p-6 pt-28">
      <div className="mx-auto max-w-3xl">
        <span className="tenant-chip mb-4 inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
          Runtime Validation
        </span>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Test Page</h1>
        <p className="mb-4 text-gray-600">This is a test page for {theme.tenantName}.</p>
        <Link href="/" className="tenant-brand-text inline-flex items-center text-gray-700">
          <MoveLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
