import "./globals.css";
import RuntimeAppShell from "@/components/runtime/RuntimeAppShell";
import { RuntimeConfigProvider } from "../runtime/providers/RuntimeConfigProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-slate-900" suppressHydrationWarning>
        <RuntimeConfigProvider>
          <RuntimeAppShell>{children}</RuntimeAppShell>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
