'use client';

import type { PropsWithChildren } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import SidebarNav from './sidebar-nav';
import UserNav from './user-nav';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import Link from 'next/link';

// Custom Logo SVG
const SynergyLearnLogo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
    <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 15"/>
    <circle cx="50" cy="50" r="15" fill="currentColor"/>
  </svg>
);


export default function MainLayout({ children }: PropsWithChildren) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="flex items-center justify-between p-4">
          <Link href="/" className="flex items-center gap-2">
            <SynergyLearnLogo />
            <h1 className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">SynergyLearn</h1>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarNav />
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(true)}
                className="md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            )}
             {/* Placeholder for breadcrumbs or page title if needed */}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
