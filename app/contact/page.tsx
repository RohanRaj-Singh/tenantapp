"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useTheme } from "@/runtime/theme/useTheme";

export default function ContactPage() {
  const theme = useTheme();

  return (
    <div className="tenant-page-shell min-h-screen p-6 pt-28">
      <div className="mx-auto max-w-3xl">
        <span className="tenant-chip mb-4 inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
          Contact
        </span>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="mb-8 text-gray-600">
          Have questions about the {theme.tenantName} wellbeing survey? Reach out to us.
        </p>

        <div
          className="rounded-lg border bg-white p-6 shadow"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <div className="space-y-4">
            {[
              { icon: Mail, text: "support@remedygcc.com" },
              { icon: Phone, text: "+1 (555) 123-4567" },
              { icon: MapPin, text: "Dubai, United Arab Emirates" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.text} className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.surfaceAccentStrong, color: theme.linkColor }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-gray-700">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
