'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  User,
  Phone,
  Calendar,
  LogOut,
  Trash2,
  Droplets,
  Shield,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { stats } = useSync();
  const [isClearing, setIsClearing] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // Clear all readings for this user
      if (user) {
        await db.readings.where('officerPhone').equals(user.phone).delete();
        await db.syncLogs.clear();
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg">Profile</h1>
          <p className="text-sm opacity-90">Account settings</p>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.phone}</p>
              
              {/* Sierra Leone flag stripe */}
              <div className="flex h-1 w-24 mt-4 rounded-full overflow-hidden">
                <div className="flex-1 bg-primary" />
                <div className="flex-1 bg-card border-y border-border" />
                <div className="flex-1 bg-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{user?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{user?.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="font-medium">
                  {user?.createdAt ? format(user.createdAt, 'PPP') : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Readings</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stats.synced}</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-2">
                  <Info className="h-5 w-5 text-warning" />
                </div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full h-12 justify-start">
                <Trash2 className="mr-3 h-5 w-5 text-destructive" />
                Clear Local Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Local Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all your locally stored readings that have not been synced.
                  Synced data will remain on the server. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isClearing}
                >
                  {isClearing ? 'Clearing...' : 'Clear Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full h-12 justify-start">
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access your account.
                  {stats.pending > 0 && (
                    <span className="block mt-2 text-destructive">
                      Warning: You have {stats.pending} unsynced readings that may be lost.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <div className="flex h-1 w-16 mx-auto rounded-full overflow-hidden mb-3">
            <div className="flex-1 bg-primary" />
            <div className="flex-1 bg-card border-y border-border" />
            <div className="flex-1 bg-accent" />
          </div>
          <p className="text-sm font-medium text-foreground">HydroGauge SL</p>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ministry of Water Resources
          </p>
          <p className="text-xs text-muted-foreground">
            Sierra Leone
          </p>
        </div>
      </div>
    </div>
  );
}
