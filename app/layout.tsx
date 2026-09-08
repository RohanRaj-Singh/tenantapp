import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./AppShell";

/**
 * Static SSR fallback only — the runtime tenant name (resolved per subdomain
 * on the client) replaces this via the tab-title store in TenantTabTitle.
 */
export const metadata: Metadata = {
  title: "RemedyGCC",
  description: "Employee wellbeing and reimbursement portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-slate-900" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
