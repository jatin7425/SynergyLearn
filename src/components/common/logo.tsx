
// src/components/common/logo.tsx
import Link from 'next/link';

export const SynergyLearnLogoIcon = ({ className }: { className?: string }) => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "text-primary"}>
    <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 15"/>
    <circle cx="50" cy="50" r="15" fill="currentColor"/>
  </svg>
);

export const LandingPageLogo = () => (
  <Link href="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
    <SynergyLearnLogoIcon />
    <h1 className="text-2xl font-headline font-semibold text-primary">SynergyLearn</h1>
  </Link>
);

export const MainAppLogo = () => (
 <Link href="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
    <SynergyLearnLogoIcon />
    <h1 className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">SynergyLearn</h1>
  </Link>
);
