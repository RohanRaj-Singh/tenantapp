"use client";

import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function AboutPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const tenantName = config?.tenant?.name || 'RemedyGCC';
  const primaryColor = config?.branding?.primaryColor || '#f58220';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="flex w-full flex-col items-center justify-center bg-gray-50 p-4 py-12 pt-28 text-center">
        <h1 className="mb-4 text-4xl font-medium text-gray-900">
          About <span className="font-semibold" style={{ color: primaryColor }}>Remedy</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-gray-600">
          {tenantName} partners with RemedyGCC to provide comprehensive wellbeing insights.
        </p>

        <div className="mx-auto mt-12 mb-12 max-w-5xl rounded-lg bg-white p-6 shadow-md">
          <p className="mb-6 text-sm text-gray-700 md:text-base">
            Our wellbeing platform helps organizations understand and improve employee experience through data-driven insights.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 text-center shadow-md">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Our Mission</h3>
            <p className="text-sm text-gray-600">
              To create healthier, more productive workplaces through meaningful employee feedback.
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow-md">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Our Vision</h3>
            <p className="text-sm text-gray-600">
              A world where every workplace prioritizes mental health and wellbeing.
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow-md">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Our Values</h3>
            <p className="text-sm text-gray-600">
              Privacy, Accuracy, Simplicity, and Growth guide everything we do.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}