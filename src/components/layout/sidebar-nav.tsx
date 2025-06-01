
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
  CalendarClock, // Added for Schedule
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmap', icon: GitFork },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/flashcards-quizzes', label: 'Flashcards & Quizzes', icon: BookOpen },
  { href: '/schedule', label: 'Schedule', icon: CalendarClock }, // Added Schedule
  { href: '/study-rooms', label: 'Study Rooms', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/gamification', label: 'Rewards', icon: Award },
  {
    label: 'AI Tools',
    icon: Sparkles,
    subItems: [
      { href: '/ai/milestone-suggestions', label: 'Milestone Suggestions', icon: Lightbulb },
      { href: '/ai/flashcard-generator', label: 'Flashcard Generator', icon: HelpCircle },
    ],
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          {item.subItems ? (
            <>
              <SidebarMenuButton
                tooltip={{ children: item.label }}
                className={cn(
                  pathname.startsWith(item.href || '___nevermatch___') && 'bg-sidebar-accent text-sidebar-accent-foreground'
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
                        <subItem.icon className="mr-2 h-4 w-4" />
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
