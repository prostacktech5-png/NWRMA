import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import type { WaterReading } from '../lib/db';
import { hydroStore } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { displayReadingTimeOnly } from '../lib/utils';
import { COLORS } from '../lib/theme';

type DateFilter = 'all' | 'today' | 'yesterday' | 'week';
type StatusFilter = 'all' | 'pending' | 'synced' | 'failed';

export default function SubmissionsScreen() {
  const { user } = useAuth();
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<WaterReading | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await hydroStore.readingsWherePhone(user.phone);
      setReadings(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...readings];
    const now = new Date();

    if (dateFilter !== 'all') {
      list = list.filter((r) => {
        const created = new Date(r.createdAt);
        if (dateFilter === 'today') return isToday(created);
        if (dateFilter === 'yesterday') return isYesterday(created);
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return created >= startOfDay(weekAgo);
        }
        return true;
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.syncStatus === statusFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const river = (r.riverName ?? '').toLowerCase();
        const loc = r.location.toLowerCase();
        return river.includes(q) || loc.includes(q) || r.waterLevel.toString().includes(q);
      });
    }

    return list;
  }, [readings, dateFilter, statusFilter, searchQuery]);

  const formatDateLine = (d: Date) => {
    if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
    if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, yyyy h:mm a');
  };

  const statusBadge = (s: WaterReading['syncStatus']) => {
    if (s === 'synced')
      return (
        <View style={[styles.badge, styles.badgeOk]}>
          <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
          <Text style={[styles.badgeText, { color: COLORS.primary }]}>Synced</Text>
        </View>
      );
    if (s === 'pending')
      return (
        <View style={[styles.badge, styles.badgeWarn]}>
          <ActivityIndicator size="small" color={COLORS.warning} />
          <Text style={[styles.badgeText, { color: COLORS.warning }]}>Pending</Text>
        </View>
      );
    return (
      <View style={[styles.badge, styles.badgeBad]}>
        <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
        <Text style={[styles.badgeText, { color: COLORS.destructive }]}>Failed</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Submissions</Text>
          <Text style={styles.headerSub}>{readings.length} total readings</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search by river, location, or level…"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.pickerRow}>
          <View style={styles.pickerHalf}>
            <Picker
              selectedValue={dateFilter}
              onValueChange={(v) => setDateFilter(v as DateFilter)}
            >
              <Picker.Item label="All Time" value="all" />
              <Picker.Item label="Today" value="today" />
              <Picker.Item label="Yesterday" value="yesterday" />
              <Picker.Item label="This Week" value="week" />
            </Picker>
          </View>
          <View style={styles.pickerHalf}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <Picker.Item label="All Status" value="all" />
              <Picker.Item label="Synced" value="synced" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Failed" value="failed" />
            </Picker>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="water" size={40} color={COLORS.muted} style={{ opacity: 0.45 }} />
              <Text style={styles.emptyText}>No readings found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setSelected(item)}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Ionicons name="location" size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.riverName?.trim()
                      ? `${item.riverName} · ${item.location}`
                      : item.location}
                  </Text>
                </View>
                {statusBadge(item.syncStatus)}
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.level}>{item.waterLevel}m</Text>
                <Text style={styles.time}>{displayReadingTimeOnly(item.readingTime)}</Text>
              </View>
              <Text style={styles.created}>{formatDateLine(new Date(item.createdAt))}</Text>
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reading Details</Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                <Ionicons name="close" size={24} color={COLORS.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {selected ? (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>{statusBadge(selected.syncStatus)}</View>
                  {selected.photoBase64 ? (
                    <Image
                      source={{ uri: selected.photoBase64 }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : null}
                  {detailRow('Officer', selected.officerName)}
                  {detailRow('Phone', selected.officerPhone)}
                  {detailRow('River name', selected.riverName ?? '')}
                  {detailRow('Location', selected.location)}
                  {detailRow('Water Level', `${selected.waterLevel} meters`)}
                  <View style={styles.grid2}>
                    {detailBox('Reading Time', displayReadingTimeOnly(selected.readingTime))}
                    {detailBox('Date', selected.date)}
                  </View>
                  {selected.gpsLat != null && selected.gpsLng != null
                    ? detailRow('GPS', `${selected.gpsLat.toFixed(6)}, ${selected.gpsLng.toFixed(6)}`)
                    : null}
                  {selected.remarks ? detailRow('Remarks', selected.remarks) : null}
                  {selected.syncError ? (
                    <View style={styles.errBox}>
                      <Text style={styles.errText}>Sync Error: {selected.syncError}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function detailRow(label: string, value: string) {
  if (!value.trim()) return null;
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailVal}>{value}</Text>
    </View>
  );
}

function detailBox(label: string, value: string) {
  return (
    <View style={[styles.detailBlock, { flex: 1 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailVal}>{value}</Text>
    </View>
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
  filters: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  search: { flex: 1, paddingVertical: 10, fontSize: 15 },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerHalf: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 8, color: COLORS.muted },
  row: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.foreground, flex: 1 },
  rowMeta: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  level: { fontWeight: '700', color: COLORS.foreground },
  time: { fontSize: 13, color: COLORS.muted },
  created: { fontSize: 11, color: COLORS.muted, marginTop: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: 'rgba(30,181,58,0.08)', borderColor: 'rgba(30,181,58,0.25)' },
  badgeWarn: { backgroundColor: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.25)' },
  badgeBad: { backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.25)' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  photo: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  detailBlock: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  detailLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  detailVal: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  grid2: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  errBox: {
    padding: 12,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  errText: { color: COLORS.destructive, fontSize: 13 },
});
