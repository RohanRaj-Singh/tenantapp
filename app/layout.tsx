import './globals.css';
import { RuntimeConfigProvider } from '../runtime';
import Header from '@/components/layout/Header';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-gray-50" suppressHydrationWarning>
        <RuntimeConfigProvider>
          <Header />
          {children}
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}