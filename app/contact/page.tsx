"use client";

import { useContext } from 'react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const primaryColor = config?.branding?.primaryColor || '#f58220';
  const tenantName = config?.tenant?.name || 'RemedyGCC';

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-28">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="mb-8 text-gray-600">
          Have questions about the {tenantName} wellbeing survey? Reach out to us.
        </p>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">support@remedygcc.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">Dubai, United Arab Emirates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}