import './globals.css';
import { RuntimeConfigProvider } from '../runtime/providers/RuntimeConfigProvider';
import Header from '@/components/layout/Header';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased text-slate-900" suppressHydrationWarning>
        <RuntimeConfigProvider>
          <Header />
          {children}
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
