"use client";

import Link from 'next/link';
import { MoveLeft } from 'lucide-react';
import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function TestPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const tenantName = config?.tenant?.name || 'RemedyGCC';

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-28">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Test Page</h1>
        <p className="mb-4 text-gray-600">
          This is a test page for {tenantName}.
        </p>
        <Link href="/" className="inline-flex items-center text-gray-700">
          <MoveLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}