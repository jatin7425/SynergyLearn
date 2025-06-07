
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/main-layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';

export default function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const noLayoutPaths = ['/login', '/signup'];

  // Show a full-page loader while auth state is being determined
  // This prevents layout flicker or content being shown prematurely
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If on the root path AND user is not logged in, show children directly (this will be the landing page)
  if (pathname === '/' && !user) {
    return <>{children}</>;
  }

  // If on a path that should never have the main layout (e.g., login, signup)
  if (noLayoutPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // For all other cases (includes authenticated root, other app pages like /notes, /settings, etc.), apply MainLayout
  return (
    <SidebarProvider defaultOpen>
      <MainLayout>
        {children}
      </MainLayout>
    </SidebarProvider>
  );
}
