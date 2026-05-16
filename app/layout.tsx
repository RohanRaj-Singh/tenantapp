import "./globals.css";
import RuntimeAppShell from "@/components/runtime/RuntimeAppShell";
import { RuntimeConfigProvider } from "../runtime/providers/RuntimeConfigProvider";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-slate-900" suppressHydrationWarning>
        <Suspense fallback={null}>
          <RuntimeConfigProvider>
            <RuntimeAppShell>{children}</RuntimeAppShell>
          </RuntimeConfigProvider>
        </Suspense>
      </body>
    </html>
  );
}
