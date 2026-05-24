'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, type WaterReading, type SyncLog } from '@/lib/db';
import { useSync } from '@/lib/sync-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Cloud,
  CloudOff,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

export default function SyncPage() {
  const router = useRouter();
  const { stats, isSyncing, isOnline, lastSyncTime, syncNow, refreshStats } = useSync();
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [pendingReadings, setPendingReadings] = useState<WaterReading[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const logs = await db.syncLogs.orderBy('timestamp').reverse().limit(10).toArray();
      setRecentLogs(logs);
      
      const pending = await db.readings
        .where('syncStatus')
        .anyOf(['pending', 'failed'])
        .toArray();
      setPendingReadings(pending);
    };
    
    loadData();
  }, [stats]);

  const handleSync = async () => {
    await syncNow();
    await refreshStats();
    
    // Refresh pending list
    const pending = await db.readings
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .toArray();
    setPendingReadings(pending);
    
    const logs = await db.syncLogs.orderBy('timestamp').reverse().limit(10).toArray();
    setRecentLogs(logs);
  };

  const retryFailed = async () => {
    // Reset failed readings to pending
    await db.readings
      .where('syncStatus')
      .equals('failed')
      .modify({ syncStatus: 'pending', syncError: undefined });
    
    await refreshStats();
    await handleSync();
  };

  const syncProgress = stats.total > 0 
    ? Math.round((stats.synced / stats.total) * 100) 
    : 100;

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
          <h1 className="font-semibold text-lg">Sync Status</h1>
          <p className="text-sm opacity-90">Manage data synchronization</p>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* Connection Status */}
        <Card className={isOnline ? 'border-primary/30' : 'border-destructive/30'}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isOnline ? 'bg-primary/10' : 'bg-destructive/10'
            }`}>
              {isOnline ? (
                <Wifi className="h-6 w-6 text-primary" />
              ) : (
                <WifiOff className="h-6 w-6 text-destructive" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {isOnline ? 'Connected' : 'Offline'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Ready to sync data' 
                  : 'Readings will sync when online'}
              </p>
            </div>
            {isOnline && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Online
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Sync Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sync Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={syncProgress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{stats.synced} synced</span>
                <span className="font-medium">{syncProgress}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Cloud className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{stats.synced}</p>
              <p className="text-xs text-muted-foreground">Synced</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                <CloudOff className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Actions */}
        <div className="space-y-2">
          <Button
            className="w-full h-14 text-base"
            onClick={handleSync}
            disabled={isSyncing || !isOnline || (stats.pending === 0 && stats.failed === 0)}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Now
              </>
            )}
          </Button>
          
          {stats.failed > 0 && (
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={retryFailed}
              disabled={isSyncing || !isOnline}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Failed ({stats.failed})
            </Button>
          )}
        </div>

        {/* Last Sync Time */}
        {lastSyncTime && (
          <p className="text-sm text-center text-muted-foreground">
            Last sync: {format(lastSyncTime, 'PPp')}
          </p>
        )}

        {/* Pending Readings */}
        {pendingReadings.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Pending Uploads
            </h3>
            <div className="space-y-2">
              {pendingReadings.slice(0, 5).map((reading) => (
                <Card key={reading.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm leading-snug">
                        {reading.riverName?.trim()
                          ? `${reading.riverName} · ${reading.location}`
                          : reading.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reading.waterLevel}m - {reading.date}
                      </p>
                    </div>
                    <Badge
                      variant={reading.syncStatus === 'failed' ? 'destructive' : 'secondary'}
                      className={reading.syncStatus === 'pending' 
                        ? 'bg-warning/10 text-warning border-warning/20' 
                        : ''
                      }
                    >
                      {reading.syncStatus === 'pending' && (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {reading.syncStatus === 'failed' && (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {reading.syncStatus}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {pendingReadings.length > 5 && (
                <p className="text-sm text-center text-muted-foreground">
                  +{pendingReadings.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentLogs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Recent Activity
            </h3>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {log.status === 'success' ? 'Sync successful' : 'Sync failed'}
                      </p>
                      {log.error && (
                        <p className="text-xs text-destructive truncate">{log.error}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(log.timestamp, 'h:mm a')}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
