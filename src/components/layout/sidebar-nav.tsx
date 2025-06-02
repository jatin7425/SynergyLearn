
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitFork,
  FileText,
  Users,
  BarChart3,
  Settings,
  Lightbulb,
  Sparkles,
  BookOpen,
  HelpCircle,
  Award,
  CalendarClock,
  MapPin,
  LifeBuoy, 
  ShieldCheck, 
  UserCog,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Define the admin UID here or import from a shared config
const ADMIN_UID = 'Mcjp0wyJVcal3ocfav9aMOHzNzV2';

const navItemsBase = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: GitFork },
  { href: '/progress-map', label: 'Progress Map', icon: MapPin },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/flashcards-quizzes', label: 'Flashcards & Quizzes', icon: BookOpen },
  { href: '/schedule', label: 'Schedule', icon: CalendarClock },
  { href: '/study-rooms', label: 'Study Rooms', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/gamification', label: 'Rewards', icon: Award },
  {
    label: 'AI Tools',
    icon: Sparkles,
    subItems: [
      { href: '/ai/milestone-suggestions', label: 'Milestone Suggestions', icon: Lightbulb },
      { href: '/ai/flashcard-generator', label: 'Flashcard Generator', icon: HelpCircle },
      { href: '/ai/support-bot', label: 'Support Bot', icon: LifeBuoy }, 
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
  {
    label: 'Admin',
    icon: ShieldCheck,
    subItems: [
        { href: '/admin/model-settings', label: 'Model Settings', icon: Sparkles },
        { href: '/admin/user-management', label: 'User Management', icon: UserCog },
    ],
  }
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth(); // Get current user from AuthContext

  const currentNavItems = user?.uid === ADMIN_UID ? [...navItemsBase, ...adminNavItems] : navItemsBase;

  return (
    <>
      {currentNavItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          {item.subItems ? (
            <>
              <SidebarMenuButton
                tooltip={{ children: item.label }}
                className={cn(
                  item.subItems.some(sub => pathname.startsWith(sub.href)) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                isActive={item.subItems.some(sub => pathname === sub.href)}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.href}>
                    <Link href={subItem.href} legacyBehavior passHref>
                      <SidebarMenuSubButton
                        isActive={pathname === subItem.href}
                        aria-current={pathname === subItem.href ? 'page' : undefined}
                      >
                        {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" /> }
                        <span>{subItem.label}</span>
                      </SidebarMenuSubButton>
                    </Link>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </>
          ) : (
            <Link href={item.href!} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                tooltip={{ children: item.label }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          )}
        </SidebarMenuItem>
      ))}
    </>
  );
}
