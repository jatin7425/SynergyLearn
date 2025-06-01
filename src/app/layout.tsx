
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
// Removed MainLayout and SidebarProvider imports
import { AuthProvider } from '@/contexts/AuthContext';
import ConditionalLayout from './conditional-layout'; // Import the new ConditionalLayout

export const metadata: Metadata = {
  title: 'SynergyLearn',
  description: 'Collaborative Learning Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex">
        <AuthProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
