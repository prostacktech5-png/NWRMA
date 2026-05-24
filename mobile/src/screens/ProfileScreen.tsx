import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { useSync } from '../lib/sync-context';
import { hydroStore } from '../lib/db';
import { COLORS } from '../lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { stats, refreshStats } = useSync();
  const [clearing, setClearing] = useState(false);

  const onLogout = () => {
    Alert.alert(
      'Sign Out?',
      stats.pending > 0
        ? `You have ${stats.pending} unsynced readings that may be lost if they are only stored on this device.`
        : 'You will need to sign in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ]
    );
  };

  const onClearData = () => {
    Alert.alert(
      'Clear All Local Data?',
      'This will delete all locally stored readings for this account. Synced data should remain on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => void clearLocal(),
        },
      ]
    );
  };

  const clearLocal = async () => {
    if (!user) return;
    setClearing(true);
    try {
      await hydroStore.deleteReadingsForPhone(user.phone);
      await hydroStore.clearSyncLogs();
      await refreshStats();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const registered = user?.createdAt ? format(parseISO(user.createdAt), 'PPP') : 'Unknown';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSub}>Account settings</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={styles.flag}>
            <View style={[styles.stripe, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.stripe, { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border }]} />
            <View style={[styles.stripe, { backgroundColor: COLORS.accent }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Account Details</Text>
          <Row icon="person-outline" label="Full Name" value={user?.name ?? ''} />
          <Row icon="call-outline" label="Phone Number" value={user?.phone ?? ''} />
          <Row icon="calendar-outline" label="Registered" value={registered} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>My Statistics</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="water" size={22} color={COLORS.primary} />
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLbl}>Total</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
              <Text style={styles.statNum}>{stats.synced}</Text>
              <Text style={styles.statLbl}>Synced</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="hourglass-outline" size={22} color={COLORS.warning} />
              <Text style={styles.statNum}>{stats.pending}</Text>
              <Text style={styles.statLbl}>Pending</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.outlineBtn} onPress={onClearData} disabled={clearing}>
          <Ionicons name="trash-outline" size={20} color={COLORS.destructive} style={{ marginRight: 10 }} />
          <Text style={styles.outlineText}>{clearing ? 'Clearing…' : 'Clear Local Data'}</Text>
        </Pressable>

        <Pressable style={styles.dangerBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.dangerText}>Sign Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <View style={[styles.flag, { width: 64, alignSelf: 'center' }]}>
            <View style={[styles.stripe, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.stripe, { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border }]} />
            <View style={[styles.stripe, { backgroundColor: COLORS.accent }]} />
          </View>
          <Text style={styles.appName}>HydroGauge SL</Text>
          <Text style={styles.ver}>Version 1.0.0</Text>
          <Text style={styles.ministry}>Ministry of Water Resources</Text>
          <Text style={styles.ministry}>Sierra Leone</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={COLORS.muted} />
      </View>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
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
  scroll: { padding: 16, paddingBottom: 120 },
  hero: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30,181,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.foreground },
  phone: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  flag: {
    flexDirection: 'row',
    height: 4,
    width: 96,
    marginTop: 14,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stripe: { flex: 1 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 12, color: COLORS.muted },
  rowValue: { fontSize: 15, fontWeight: '600', color: COLORS.foreground, marginTop: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statLbl: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: COLORS.card,
    marginBottom: 10,
  },
  outlineText: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.destructive,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  dangerText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  footer: { alignItems: 'center', paddingVertical: 16 },
  appName: { fontSize: 15, fontWeight: '700', marginTop: 10 },
  ver: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  ministry: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
});
