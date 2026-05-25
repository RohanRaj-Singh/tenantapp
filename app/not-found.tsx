"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function NotFoundPage() {
  const theme = useTheme();
  const { copy } = useLanguage();

  return (
    <div className="tenant-page-shell flex min-h-screen w-full flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-lg"
        style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
      >
        <h1 className="mb-2 text-6xl font-bold text-gray-800">404</h1>
        <p className="mb-6 text-gray-600">{copy.notFound.description}</p>
        <Link
          href="/"
          className="tenant-button inline-flex items-center justify-center gap-2 rounded-full px-6 py-2 font-medium"
        >
          <Home className="h-4 w-4" />
          {copy.notFound.goHome}
        </Link>
      </div>
    </div>
  );
}
