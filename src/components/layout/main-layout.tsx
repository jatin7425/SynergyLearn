
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
import { MainAppLogo } from '@/components/common/logo';

export default function MainLayout({ children }: PropsWithChildren) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  const headerLeftOffset = isMobile 
    ? '0px' 
    : state === 'expanded' 
      ? 'var(--sidebar-width)' 
      : 'var(--sidebar-width-icon)';

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="flex items-center justify-between p-4">
          <MainAppLogo />
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
        <header 
          className="fixed top-0 right-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6"
          style={{ left: headerLeftOffset }}
        >
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full p-4 md:p-6 pt-24"> {/* Increased pt from 16 to 24 for h-16 header */}
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
