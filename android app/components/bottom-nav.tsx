'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, List, RefreshCw, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSync } from '@/lib/sync-context';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/new-reading', label: 'New', icon: PlusCircle },
  { href: '/dashboard/submissions', label: 'Readings', icon: List },
  { href: '/dashboard/sync', label: 'Sync', icon: RefreshCw },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { stats, isSyncing } = useSync();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.href === '/dashboard/sync' && stats.pending > 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative',
                'transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-6 w-6',
                    item.href === '/dashboard/sync' && isSyncing && 'animate-spin'
                  )}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {stats.pending > 99 ? '99+' : stats.pending}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
