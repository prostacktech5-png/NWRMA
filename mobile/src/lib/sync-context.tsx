import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { v4 as uuid } from 'uuid';
import { useAuth } from './auth-context';
import type { WaterReading } from './db';
import { hydroStore } from './db';
import { displayReadingTimeOnly } from './utils';
import {
  ensureNwrmaApiJwt,
  nwrmaApiHeaders,
  probeNwrmaServerReachability,
  resolveNwrmaServerBaseAsync,
  setNwrmaApiJwt,
} from './nwrma-api';

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
  isServerReachable: boolean;
  serverBaseUrl: string;
  lastSyncError: string | null;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  refreshStats: () => Promise<void>;
  probeServer: (options?: { rediscover?: boolean }) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

/** LAN API sync must work even when Android reports no "internet" (office Wi‑Fi without Google reachability). */
function deviceLooksOnline(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isConnected === true) return true;
  return state.isInternetReachable !== false;
}

function toIsoDateTimeForApi(reading: WaterReading): string {
  const raw = reading.dateTime;
  if (typeof raw === 'string' && raw.trim()) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function mapReadingToPayload(reading: WaterReading) {
  return {
    clientLocalId: reading.id,
    officerName: reading.officerName,
    officerPhone: reading.officerPhone,
    riverName: reading.riverName ?? '',
    location: reading.location,
    waterLevel: reading.waterLevel,
    readingTime: displayReadingTimeOnly(reading.readingTime),
    date: reading.date,
    dateTime: toIsoDateTimeForApi(reading),
    gpsLat: reading.gpsLat,
    gpsLng: reading.gpsLng,
    photoBase64: reading.photoBase64,
    remarks: reading.remarks,
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const officerPhone = user?.phone?.trim() ?? '';

  const [stats, setStats] = useState<SyncStats>({
    pending: 0,
    synced: 0,
    failed: 0,
    total: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(false);
  const [serverBaseUrl, setServerBaseUrl] = useState('');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(deviceLooksOnline(state));
    });
    NetInfo.fetch().then((state) => {
      if (isMounted.current) {
        setIsOnline(deviceLooksOnline(state));
      }
    });
    return () => unsub();
  }, []);

  const probeServer = useCallback(async (options?: { rediscover?: boolean }) => {
    try {
      const { reachable, base } = await probeNwrmaServerReachability(options);
      if (isMounted.current) {
        setIsServerReachable(reachable);
        setServerBaseUrl(base);
      }
    } catch {
      if (isMounted.current) {
        setIsServerReachable(false);
        setServerBaseUrl('');
      }
    }
  }, []);

  useEffect(() => {
    void probeServer();
    const interval = setInterval(() => void probeServer(), 30_000);
    return () => clearInterval(interval);
  }, [probeServer]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void probeServer();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [probeServer]);

  const refreshStats = useCallback(async () => {
    if (!officerPhone) {
      setStats({ pending: 0, synced: 0, failed: 0, total: 0 });
      return;
    }
    try {
      const mine = await hydroStore.readingsWherePhone(officerPhone);
      const pending = mine.filter((r) => r.syncStatus === 'pending').length;
      const synced = mine.filter((r) => r.syncStatus === 'synced').length;
      const failed = mine.filter((r) => r.syncStatus === 'failed').length;
      setStats({ pending, synced, failed, total: mine.length });
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  }, [officerPhone]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const syncWithNwrmaServer = async (
    readings: WaterReading[],
  ): Promise<{ ok: boolean; error?: string }> => {
    if (readings.length === 0) return { ok: true };

    let base = (await resolveNwrmaServerBaseAsync()).trim();
    await probeServer();

    let auth = await ensureNwrmaApiJwt();
    if (!auth.token) {
      auth = await ensureNwrmaApiJwt({ forceRefresh: true });
    }
    const jwt = auth.token;

    if (!base) {
      const err =
        !__DEV__
          ? 'Set EXPO_PUBLIC_NWRMA_SERVER_URL for production.'
          : 'NWRMA server URL not configured.';
      for (const reading of readings) {
        await hydroStore.updateReading(reading.id, {
          syncStatus: 'failed',
          syncError: err,
        });
      }
      return { ok: false, error: err };
    }

    if (!jwt) {
      const authHint = auth.error ?? 'Could not sign in to the server.';
      for (const reading of readings) {
        await hydroStore.updateReading(reading.id, {
          syncStatus: 'failed',
          syncError: authHint,
        });
      }
      return { ok: false, error: authHint };
    }

    try {
      const payload = readings.map(mapReadingToPayload);

      let response = await fetch(`${base}/sync/offline-data`, {
        method: 'POST',
        headers: nwrmaApiHeaders({ Authorization: `Bearer ${jwt}` }),
        body: JSON.stringify({ reports: payload }),
      });

      if (response.status === 401) {
        await setNwrmaApiJwt(null);
        const refreshed = await ensureNwrmaApiJwt({ forceRefresh: true });
        if (refreshed.token) {
          response = await fetch(`${base}/sync/offline-data`, {
            method: 'POST',
            headers: nwrmaApiHeaders({ Authorization: `Bearer ${refreshed.token}` }),
            body: JSON.stringify({ reports: payload }),
          });
        }
      }

      let body = {} as {
        applied?: unknown;
        errors?: { index?: number; message?: string }[];
        error?: unknown;
      };
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      if (response.status !== 200 && response.status !== 207) {
        const combined =
          typeof body.error === 'string'
            ? body.error
            : `Server error (${response.status})`;
        throw new Error(combined);
      }

      const failedIndices = new Set<number>();
      if (Array.isArray(body.errors)) {
        for (const err of body.errors) {
          if (typeof err?.index === 'number') failedIndices.add(err.index);
        }
      }

      let allOk = failedIndices.size === 0;
      let firstRowError: string | undefined;

      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        const idxErr =
          failedIndices.has(i) && Array.isArray(body.errors)
            ? body.errors.find((x) => x?.index === i)
            : undefined;

        if (failedIndices.has(i)) {
          const msg =
            typeof idxErr?.message === 'string' ? idxErr.message : 'Row rejected';
          if (!firstRowError) firstRowError = msg;
          allOk = false;
          await hydroStore.updateReading(reading.id, {
            syncStatus: 'failed',
            syncError: msg,
          });
          await hydroStore.addSyncLog({
            id: uuid(),
            readingId: reading.id,
            status: 'failed',
            error: msg,
            timestamp: new Date().toISOString(),
          });
        } else {
          await hydroStore.updateReading(reading.id, {
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
            syncError: undefined,
          });
          await hydroStore.addSyncLog({
            id: uuid(),
            readingId: reading.id,
            status: 'success',
            timestamp: new Date().toISOString(),
          });
        }
      }

      return allOk ? { ok: true } : { ok: false, error: firstRowError ?? 'Some readings failed to upload.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await resolveNwrmaServerBaseAsync({ rediscover: true });
      await probeServer({ rediscover: true });
      base = (await resolveNwrmaServerBaseAsync()).trim();

      for (const reading of readings) {
        await hydroStore.updateReading(reading.id, {
          syncStatus: 'failed',
          syncError: errorMessage,
        });
        await hydroStore.addSyncLog({
          id: uuid(),
          readingId: reading.id,
          status: 'failed',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
      return { ok: false, error: errorMessage };
    }
  };

  const syncNow = useCallback(async () => {
    if (isSyncing || !officerPhone) return;
    setIsSyncing(true);
    try {
      await probeServer();
      const toSync = await hydroStore.readingsBySyncStatusesForPhone(officerPhone, [
        'pending',
        'failed',
      ]);
      const result = await syncWithNwrmaServer(toSync);
      if (result.error) {
        setLastSyncError(result.error);
      } else {
        setLastSyncError(null);
      }
      setLastSyncTime(new Date());
      await refreshStats();
      await probeServer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      setLastSyncError(msg);
      console.error('Sync failed:', e);
      await probeServer({ rediscover: true });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, officerPhone, refreshStats, probeServer]);

  const pendingRef = useRef(stats.pending);
  pendingRef.current = stats.pending;
  const wasOffline = useRef(false);
  const didBootSync = useRef(false);
  const officerPhoneRef = useRef(officerPhone);
  officerPhoneRef.current = officerPhone;

  useEffect(() => {
    didBootSync.current = false;
  }, [officerPhone]);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current && pendingRef.current > 0 && officerPhoneRef.current) {
      wasOffline.current = false;
      void syncNow();
    }
  }, [isOnline, syncNow]);

  /** Upload pending readings when the app opens (field officers often never tap Sync). */
  useEffect(() => {
    if (!officerPhone || didBootSync.current) return;
    didBootSync.current = true;
    void (async () => {
      await refreshStats();
      const pending = await hydroStore.readingsBySyncStatusesForPhone(officerPhone, [
        'pending',
        'failed',
      ]);
      if (pending.length > 0) {
        await syncNow();
      }
    })();
  }, [officerPhone, refreshStats, syncNow]);

  const value = useMemo(
    () => ({
      stats,
      isSyncing,
      isOnline,
      isServerReachable,
      serverBaseUrl,
      lastSyncError,
      lastSyncTime,
      syncNow,
      refreshStats,
      probeServer,
    }),
    [
      stats,
      isSyncing,
      isOnline,
      isServerReachable,
      serverBaseUrl,
      lastSyncError,
      lastSyncTime,
      syncNow,
      refreshStats,
      probeServer,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within a SyncProvider');
  return ctx;
}
