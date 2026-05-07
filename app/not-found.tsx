"use client";

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function NotFoundPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const primaryColor = config?.branding?.primaryColor || '#f58220';

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h1 className="mb-2 text-6xl font-bold text-gray-800">404</h1>
        <p className="mb-6 text-gray-600">Page not found</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2 font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}