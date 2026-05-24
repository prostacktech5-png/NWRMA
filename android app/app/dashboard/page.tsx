'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  List,
  RefreshCw,
  User,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, isOnline, isSyncing } = useSync();

  const menuItems = [
    {
      href: '/dashboard/new-reading',
      icon: PlusCircle,
      label: 'New Reading',
      description: 'Record water level',
      color: 'bg-primary',
    },
    {
      href: '/dashboard/submissions',
      icon: List,
      label: 'My Submissions',
      description: `${stats.total} total readings`,
      color: 'bg-accent',
    },
    {
      href: '/dashboard/sync',
      icon: RefreshCw,
      label: 'Sync Status',
      description: stats.pending > 0 ? `${stats.pending} pending` : 'All synced',
      color: stats.pending > 0 ? 'bg-[#D4A017]' : 'bg-primary',
      badge: stats.pending > 0 ? stats.pending : null,
    },
    {
      href: '/dashboard/profile',
      icon: User,
      label: 'Profile',
      description: 'Account settings',
      color: 'bg-muted-foreground',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Flat design */}
      <header className="bg-primary text-primary-foreground px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <Image
                src="/image-removebg-preview.png"
                alt="NWRMA Logo"
                width={52}
                height={52}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg">HydroGauge SL</h1>
              <p className="text-sm opacity-90">NWRMA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-white/20 text-primary-foreground border-0 rounded-sm">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-red-500/80 text-white border-0 rounded-sm">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-white/10 p-4 rounded-sm">
          <p className="text-sm opacity-80">Welcome back,</p>
          <p className="font-semibold text-lg">{user?.name}</p>
        </div>
      </header>

      {/* Quick Stats - Flat design */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border p-3 text-center rounded-sm">
            <p className="text-2xl font-bold text-primary">{stats.synced}</p>
            <p className="text-xs text-muted-foreground">Synced</p>
          </div>
          <div className="bg-card border border-border p-3 text-center rounded-sm">
            <p className="text-2xl font-bold text-[#D4A017]">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card border border-border p-3 text-center rounded-sm">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </div>

      {/* Menu Items - Flat design */}
      <div className="px-4 mt-6 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Menu
        </h2>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="bg-card border border-border p-4 flex items-center gap-4 rounded-sm active:bg-muted">
                <div className={`w-12 h-12 rounded-sm ${item.color} flex items-center justify-center relative`}>
                  <Icon className={`w-6 h-6 text-white ${item.href === '/dashboard/sync' && isSyncing ? 'animate-spin' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs font-bold bg-destructive text-white rounded-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sierra Leone flag stripe at bottom */}
      <div className="px-4 mt-8">
        <div className="flex h-1 overflow-hidden">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-white border-y border-border" />
          <div className="flex-1 bg-accent" />
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          National Water Resources Management Agency
        </p>
      </div>
    </div>
  );
}
