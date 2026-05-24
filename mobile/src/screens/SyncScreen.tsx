import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SyncLog, WaterReading } from '../lib/db';
import { hydroStore } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { useSync } from '../lib/sync-context';
import { COLORS } from '../lib/theme';

export default function SyncScreen() {
  const { user } = useAuth();
  const officerPhone = user?.phone?.trim() ?? '';
  const {
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
  } = useSync();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [pendingReadings, setPendingReadings] = useState<WaterReading[]>([]);

  const reloadLists = useCallback(async () => {
    if (!officerPhone) {
      setLogs([]);
      setPendingReadings([]);
      return;
    }
    const recent = await hydroStore.recentSyncLogsForPhone(10, officerPhone);
    setLogs(recent);
    const pending = await hydroStore.readingsBySyncStatusesForPhone(officerPhone, [
      'pending',
      'failed',
    ]);
    setPendingReadings(pending);
  }, [officerPhone]);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists, stats]);

  const handleSync = async () => {
    await probeServer();
    await syncNow();
    await refreshStats();
    await reloadLists();
  };

  const retryFailed = async () => {
    if (!officerPhone) return;
    await hydroStore.setFailedToPendingForPhone(officerPhone);
    await refreshStats();
    await handleSync();
  };

  const syncProgress = stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sync Status</Text>
          <Text style={styles.headerSub}>Manage data synchronization</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, !isOnline && styles.cardWarn]}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isOnline ? 'rgba(30,181,58,0.12)' : 'rgba(220,38,38,0.12)' },
              ]}
            >
              <Ionicons
                name={isOnline ? 'wifi' : 'cloud-offline'}
                size={26}
                color={isOnline ? COLORS.primary : COLORS.destructive}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{isOnline ? 'Network connected' : 'Network offline'}</Text>
              <Text style={styles.cardSub}>
                {isOnline
                  ? 'Wi‑Fi or mobile data is available'
                  : 'Readings will sync when network returns'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, !isServerReachable && styles.cardWarn]}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isServerReachable
                    ? 'rgba(30,181,58,0.12)'
                    : 'rgba(220,38,38,0.12)',
                },
              ]}
            >
              <Ionicons
                name={isServerReachable ? 'server' : 'server-outline'}
                size={26}
                color={isServerReachable ? COLORS.primary : COLORS.destructive}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {isServerReachable ? 'NWRMA server reachable' : 'Cannot reach NWRMA server'}
              </Text>
              <Text style={styles.cardSub} numberOfLines={4}>
                {isServerReachable && serverBaseUrl
                  ? serverBaseUrl
                  : serverBaseUrl?.includes('192.168.') || serverBaseUrl?.includes('10.0.2.2')
                    ? `${serverBaseUrl} — LAN only, or set a public NWRMA_API_URL and rebuild the APK`
                    : serverBaseUrl
                      ? `${serverBaseUrl} — check mobile data/Wi‑Fi; server or tunnel must be running`
                      : 'Set NWRMA_API_URL (public) in env/nwrma.env, run npm run dev:field, rebuild APK'}
              </Text>
            </View>
          </View>
        </View>

        {lastSyncError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.destructive} />
            <Text style={styles.errorBannerText}>{lastSyncError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sync Progress</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.metaText}>{stats.synced} synced</Text>
            <Text style={styles.metaStrong}>{syncProgress}%</Text>
          </View>
        </View>

        <View style={styles.stats3}>
          <View style={styles.statBox}>
            <Ionicons name="cloud-done" size={22} color={COLORS.primary} />
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{stats.synced}</Text>
            <Text style={styles.statLbl}>Synced</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={22} color={COLORS.warning} />
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLbl}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="alert-circle-outline" size={22} color={COLORS.destructive} />
            <Text style={[styles.statNum, { color: COLORS.destructive }]}>{stats.failed}</Text>
            <Text style={styles.statLbl}>Failed</Text>
          </View>
        </View>

        <Pressable
          style={[styles.primaryBtn, (isSyncing || (stats.pending === 0 && stats.failed === 0)) && styles.disabled]}
          onPress={() => void handleSync()}
          disabled={isSyncing || (stats.pending === 0 && stats.failed === 0)}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Sync Now</Text>
            </>
          )}
        </Pressable>

        {stats.failed > 0 ? (
          <Pressable
            style={[styles.outlineBtn, isSyncing && styles.disabled]}
            onPress={() => void retryFailed()}
            disabled={isSyncing}
          >
            <Ionicons name="refresh" size={18} color={COLORS.foreground} style={{ marginRight: 8 }} />
            <Text style={styles.outlineBtnText}>Retry Failed ({stats.failed})</Text>
          </Pressable>
        ) : null}

        {lastSyncTime ? (
          <Text style={styles.lastSync}>Last sync: {format(lastSyncTime, 'PPp')}</Text>
        ) : null}

        {pendingReadings.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.listHeading}>Pending Uploads</Text>
            {pendingReadings.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.miniCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniTitle} numberOfLines={2}>
                    {r.riverName?.trim() ? `${r.riverName} · ${r.location}` : r.location}
                  </Text>
                  <Text style={styles.miniSub}>
                    {r.waterLevel}m — {r.date}
                  </Text>
                  {r.syncStatus === 'failed' ? (
                    <Text style={styles.miniErr} numberOfLines={6}>
                      {r.syncError?.trim() || 'Upload failed. Tap Retry Failed.'}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.pill,
                    r.syncStatus === 'failed' ? styles.pillBad : styles.pillWarn,
                  ]}
                >
                  <Text style={styles.pillText}>{r.syncStatus}</Text>
                </View>
              </View>
            ))}
            {pendingReadings.length > 5 ? (
              <Text style={styles.more}>+{pendingReadings.length - 5} more</Text>
            ) : null}
          </View>
        ) : null}

        {logs.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.listHeading}>Recent Activity</Text>
            {logs.map((log) => (
              <View key={log.id} style={styles.miniCard}>
                <Ionicons
                  name={log.status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={log.status === 'success' ? COLORS.primary : COLORS.destructive}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>
                    {log.status === 'success' ? 'Sync successful' : 'Sync failed'}
                  </Text>
                  {log.error ? <Text style={styles.logErr}>{log.error}</Text> : null}
                </View>
                <Text style={styles.logTime}>{format(new Date(log.timestamp), 'h:mm a')}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardWarn: { borderColor: 'rgba(220,38,38,0.35)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.foreground },
  cardSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.destructive,
    lineHeight: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  progressTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: COLORS.primary,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: { fontSize: 13, color: COLORS.muted },
  metaStrong: { fontSize: 13, fontWeight: '700' },
  stats3: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
  },
  statNum: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statLbl: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginBottom: 12,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  lastSync: { textAlign: 'center', fontSize: 13, color: COLORS.muted, marginBottom: 8 },
  listHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  miniTitle: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  miniSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  miniErr: {
    fontSize: 12,
    color: COLORS.destructive,
    marginTop: 6,
    lineHeight: 16,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  pillWarn: { backgroundColor: 'rgba(217,119,6,0.12)' },
  pillBad: { backgroundColor: 'rgba(220,38,38,0.12)' },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  more: { textAlign: 'center', fontSize: 13, color: COLORS.muted },
  logTitle: { fontSize: 14, fontWeight: '600' },
  logErr: { fontSize: 12, color: COLORS.destructive, marginTop: 2 },
  logTime: { fontSize: 11, color: COLORS.muted },
});
