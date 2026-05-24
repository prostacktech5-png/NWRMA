'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db, type WaterReading } from './db';
import { displayReadingTimeOnly } from './utils';
import { v4 as uuid } from 'uuid';

function slugStationId(river: string, location: string): string {
  const raw = `${river}|${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return raw ? `mob-${raw}` : `mob-${Date.now()}`;
}

interface SyncStats {
  pending: number;
  synced: number;
  failed: number;
  total: number;
}

interface SyncContextType {
  stats: SyncStats;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<SyncStats>({ pending: 0, synced: 0, failed: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Track online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const allReadings = await db.readings.toArray();
      const pending = allReadings.filter(r => r.syncStatus === 'pending').length;
      const synced = allReadings.filter(r => r.syncStatus === 'synced').length;
      const failed = allReadings.filter(r => r.syncStatus === 'failed').length;
      
      setStats({ pending, synced, failed, total: allReadings.length });
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, []);

  // Initial stats load
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const syncReading = async (reading: WaterReading): Promise<boolean> => {
    try {
      const river = (reading.riverName ?? '').trim();
      const loc = reading.location.trim();
      const stationId = slugStationId(river || 'field-site', loc);
      const dateIso =
        reading.dateTime instanceof Date ? reading.dateTime.toISOString() : String(reading.dateTime);

      const response = await fetch('/api/hydrology/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: reading.id,
          stationId,
          stationName: river ? `${river} — ${loc}` : loc,
          officerPhone: reading.officerPhone,
          water_level: reading.waterLevel,
          reading_date: reading.date,
          reading_time: displayReadingTimeOnly(reading.readingTime),
          date_time: dateIso,
          latitude: reading.gpsLat ?? undefined,
          longitude: reading.gpsLng ?? undefined,
          location: loc,
          remarks: reading.remarks ?? '',
        }),
      });

      if (response.ok) {
        await db.readings.update(reading.id, {
          syncStatus: 'synced',
          syncedAt: new Date(),
          syncError: undefined,
        });
        
        await db.syncLogs.add({
          id: uuid(),
          readingId: reading.id,
          status: 'success',
          timestamp: new Date(),
        });
        
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await db.readings.update(reading.id, {
        syncStatus: 'failed',
        syncError: errorMessage,
      });
      
      await db.syncLogs.add({
        id: uuid(),
        readingId: reading.id,
        status: 'failed',
        error: errorMessage,
        timestamp: new Date(),
      });
      
      return false;
    }
  };

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    
    try {
      // Get all pending and failed readings
      const toSync = await db.readings
        .where('syncStatus')
        .anyOf(['pending', 'failed'])
        .toArray();
      
      for (const reading of toSync) {
        await syncReading(reading);
      }
      
      setLastSyncTime(new Date());
      await refreshStats();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, refreshStats]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && stats.pending > 0) {
      syncNow();
    }
  }, [isOnline, stats.pending, syncNow]);

  return (
    <SyncContext.Provider value={{ stats, isSyncing, isOnline, lastSyncTime, syncNow, refreshStats }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
