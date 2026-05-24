import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MainTabParamList } from '../navigation/MainTabs';
import { useAuth } from '../lib/auth-context';
import { useSync } from '../lib/sync-context';
import { COLORS } from '../lib/theme';

type Nav = BottomTabNavigationProp<MainTabParamList>;

export default function DashboardScreen() {
  const { user } = useAuth();
  const { stats, isOnline, isSyncing } = useSync();
  const navigation = useNavigation<Nav>();

  const items: Array<{
    screen: keyof MainTabParamList;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    color: string;
    badge?: number | null;
  }> = [
    {
      screen: 'NewReading',
      icon: 'add-circle',
      label: 'New Reading',
      description: 'Record water level',
      color: COLORS.primary,
    },
    {
      screen: 'Submissions',
      icon: 'list',
      label: 'My Submissions',
      description: `${stats.total} total readings`,
      color: COLORS.accent,
    },
    {
      screen: 'Sync',
      icon: 'sync',
      label: 'Sync Status',
      description: stats.pending > 0 ? `${stats.pending} pending` : 'All synced',
      color: stats.pending > 0 ? COLORS.accent : COLORS.primary,
      badge: stats.pending > 0 ? stats.pending : null,
    },
    {
      screen: 'Profile',
      icon: 'person',
      label: 'Profile',
      description: 'Account settings',
      color: COLORS.muted,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <Image source={require('../../assets/logo-nwrma.png')} style={styles.logoImg} />
              </View>
              <View>
                <Text style={styles.headerTitle}>HydroGauge SL</Text>
                <Text style={styles.headerSub}>NWRMA</Text>
              </View>
            </View>
            <View
              style={[
                styles.netBadge,
                { backgroundColor: isOnline ? 'rgba(255,255,255,0.2)' : 'rgba(220,38,38,0.85)' },
              ]}
            >
              <Ionicons name={isOnline ? 'wifi' : 'cloud-offline'} size={14} color="#fff" />
              <Text style={styles.netText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeMuted}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{stats.synced}</Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.accent }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.destructive }]}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <Text style={styles.menuHeading}>Menu</Text>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.menuCard, pressed && { opacity: 0.9 }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              {item.screen === 'Sync' && isSyncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name={item.icon} size={24} color="#fff" />
              )}
              {item.badge != null && item.badge > 0 ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
          </Pressable>
        ))}

        <View style={styles.flagBottom}>
          <View style={[styles.flagStripe, { backgroundColor: COLORS.primary }]} />
          <View style={[styles.flagStripe, { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border }]} />
          <View style={[styles.flagStripe, { backgroundColor: COLORS.accent }]} />
        </View>
        <Text style={styles.agency}>National Water Resources Management Agency</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 44, height: 44 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  netText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  welcomeBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    borderRadius: 4,
  },
  welcomeMuted: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  welcomeName: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  menuHeading: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: COLORS.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  menuTitle: { fontSize: 16, fontWeight: '600', color: COLORS.foreground },
  menuDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  flagBottom: {
    flexDirection: 'row',
    height: 4,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    borderRadius: 2,
  },
  flagStripe: { flex: 1 },
  agency: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 12,
    paddingHorizontal: 24,
  },
});
