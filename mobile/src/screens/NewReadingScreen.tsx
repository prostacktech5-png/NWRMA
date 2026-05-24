import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  hydroStore,
  parseRiverLocationOption,
  RIVER_LOCATION_OPTIONS,
  RIVER_OTHER_VALUE,
} from '../lib/db';
import type { WaterReading } from '../lib/db';
import { formatReadingTime12h } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { useSync } from '../lib/sync-context';
import { COLORS } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NewReadingScreen() {
  const { user } = useAuth();
  const { refreshStats, syncNow } = useSync();

  const [riverPreset, setRiverPreset] = useState('');
  const [riverCustom, setRiverCustom] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [waterLevel, setWaterLevel] = useState('');
  const [remarks, setRemarks] = useState('');
  const [now, setNow] = useState(() => new Date());

  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const acquireGps = useCallback(async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission denied. Enable location in Settings.');
        return;
      }
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setGpsLat(last.coords.latitude);
        setGpsLng(last.coords.longitude);
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setGpsLat(pos.coords.latitude);
      setGpsLng(pos.coords.longitude);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Failed to get location');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  useEffect(() => {
    void acquireGps();
  }, [acquireGps]);

  const riverResolved =
    riverPreset === RIVER_OTHER_VALUE
      ? riverCustom.trim()
      : riverPreset
        ? parseRiverLocationOption(riverPreset).riverName
        : '';
  const locationTrimmed = siteLocation.trim();

  const canSubmit =
    !!waterLevel &&
    !!locationTrimmed &&
    !!riverPreset &&
    (riverPreset !== RIVER_OTHER_VALUE || !!riverCustom.trim());

  const saveReading = useCallback(async () => {
    const level = parseFloat(waterLevel.replace(',', '.').trim());
    const officerPhone = user?.phone?.trim() ?? '';
    const officerName = user?.name?.trim() ?? '';
    setIsSubmitting(true);
    try {
      const t = new Date();
      const record: WaterReading = {
        id: uuid(),
        officerName: officerName || 'Field Officer',
        officerPhone,
        location: locationTrimmed,
        riverName: riverResolved,
        waterLevel: level,
        readingTime: formatReadingTime12h(t),
        date: format(t, 'yyyy-MM-dd'),
        dateTime: t.toISOString(),
        gpsLat,
        gpsLng,
        photoBase64: null,
        remarks: remarks.trim(),
        syncStatus: 'pending',
        createdAt: t.toISOString(),
      };
      await hydroStore.addReading(record);
      try {
        await refreshStats();
      } catch (statsErr) {
        console.warn('Stats refresh after save:', statsErr);
      }
      void syncNow();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 1800);
      setRiverPreset('');
      setRiverCustom('');
      setSiteLocation('');
      setWaterLevel('');
      setRemarks('');
      setGpsLat(null);
      setGpsLng(null);
      void acquireGps();
    } catch (e) {
      console.error('Save reading failed:', e);
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'Failed to save reading. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    waterLevel,
    user,
    locationTrimmed,
    riverResolved,
    gpsLat,
    gpsLng,
    remarks,
    refreshStats,
    syncNow,
    acquireGps,
  ]);

  const onSubmit = async () => {
    if (!riverResolved || !locationTrimmed || !waterLevel) {
      Alert.alert('Missing fields', 'Please fill in all required fields');
      return;
    }
    const level = parseFloat(waterLevel.replace(',', '.').trim());
    if (!Number.isFinite(level)) {
      Alert.alert('Invalid water level', 'Enter a valid number (e.g. 2.5)');
      return;
    }
    const officerPhone = user?.phone?.trim() ?? '';
    if (!officerPhone) {
      Alert.alert(
        'Sign-in required',
        'Your account has no phone number. Log out and register again with a phone number.',
      );
      return;
    }
    if (gpsLat == null || gpsLng == null) {
      Alert.alert(
        'No GPS location',
        'GPS could not be detected. Save this reading without coordinates?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: () => void saveReading() },
        ],
      );
      return;
    }
    await saveReading();
  };

  if (submitSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>Reading Saved</Text>
          <Text style={styles.successBody}>
            Your water level reading has been saved and will sync when online.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Reading</Text>
          <Text style={styles.headerSub}>Record water level</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Field Officer</Text>
          <Text style={styles.cardName}>{user?.name}</Text>
          <Text style={styles.cardPhone}>{user?.phone}</Text>
        </View>

        <Text style={styles.label}>River and location *</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={riverPreset}
            onValueChange={(v) => {
              setRiverPreset(v);
              setRiverCustom('');
              if (v === RIVER_OTHER_VALUE) {
                setSiteLocation('');
              } else if (v) {
                const { areaLabel } = parseRiverLocationOption(v);
                setSiteLocation(areaLabel);
              }
            }}
          >
            <Picker.Item label="Select river and area…" value="" />
            {RIVER_LOCATION_OPTIONS.map((opt) => (
              <Picker.Item key={opt} label={opt} value={opt} />
            ))}
            <Picker.Item label="Other — enter river and location manually" value={RIVER_OTHER_VALUE} />
          </Picker>
        </View>
        <Text style={styles.helper}>
          Each option is river name and a main town or district along it (you can edit Location below).
        </Text>

        {riverPreset === RIVER_OTHER_VALUE ? (
          <>
            <Text style={styles.label}>River name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., river or stream name"
              value={riverCustom}
              onChangeText={setRiverCustom}
            />
          </>
        ) : null}

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., gauge station, town, bridge, landmark"
          value={siteLocation}
          onChangeText={setSiteLocation}
        />
        <Text style={styles.helper}>Gauge site or landmark (filled from the list above; you may change it).</Text>

        <Text style={styles.label}>Water Level (meters) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2.45"
          keyboardType="decimal-pad"
          value={waterLevel}
          onChangeText={setWaterLevel}
        />

        <View style={styles.dateCard}>
          <Text style={styles.dateMuted}>Date & Time</Text>
          <Text style={styles.dateVal}>{format(now, 'PPpp')}</Text>
        </View>

        <Text style={styles.label}>GPS Location</Text>
        {gpsLat != null && gpsLng != null ? (
          <View style={styles.gpsOk}>
            <Text style={styles.gpsOkTitle}>Location captured</Text>
            <Text style={styles.gpsCoords}>
              {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
            </Text>
            <Pressable style={styles.gpsRefresh} onPress={() => void acquireGps()} disabled={gpsLoading}>
              <Text style={styles.gpsRefreshText}>{gpsLoading ? 'Refreshing…' : 'Refresh GPS'}</Text>
            </Pressable>
          </View>
        ) : gpsLoading ? (
          <View style={styles.gpsDetecting}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.gpsDetectingText}>Detecting GPS…</Text>
          </View>
        ) : (
          <Pressable style={styles.outlineBtn} onPress={() => void acquireGps()} disabled={gpsLoading}>
            <Ionicons name="navigate" size={20} color={COLORS.foreground} style={{ marginRight: 8 }} />
            <Text style={styles.outlineBtnText}>Capture GPS Location</Text>
          </Pressable>
        )}
        {!!gpsError && <Text style={styles.gpsErr}>{gpsError}</Text>}

        <Text style={styles.label}>Remarks (Optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }]}
          placeholder="Any additional notes..."
          value={remarks}
          onChangeText={setRemarks}
          multiline
        />

        <Pressable
          style={[styles.primaryBtn, (!canSubmit || isSubmitting) && styles.primaryBtnDisabled]}
          onPress={() => void onSubmit()}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Save Reading</Text>
            </>
          )}
        </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  cardName: { fontSize: 16, fontWeight: '600', color: COLORS.foreground },
  cardPhone: { fontSize: 14, color: COLORS.muted },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
    marginBottom: 6,
    marginTop: 8,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  helper: { fontSize: 11, color: COLORS.muted, marginTop: 6, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateMuted: { fontSize: 13, color: COLORS.muted },
  dateVal: { fontSize: 13, fontWeight: '600', color: COLORS.foreground, flex: 1, textAlign: 'right' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
  },
  outlineBtnText: { fontSize: 16, fontWeight: '600' },
  gpsOk: {
    borderWidth: 1,
    borderColor: 'rgba(30,181,58,0.35)',
    backgroundColor: 'rgba(30,181,58,0.06)',
    borderRadius: 4,
    padding: 12,
  },
  gpsOkTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  gpsCoords: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  gpsRefresh: { marginTop: 10, alignSelf: 'flex-start' },
  gpsRefreshText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  gpsDetecting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
  },
  gpsDetectingText: { fontSize: 15, color: COLORS.muted },
  gpsErr: { color: COLORS.destructive, fontSize: 13, marginTop: 6 },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30,181,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.foreground },
  successBody: { textAlign: 'center', color: COLORS.muted, marginTop: 8, fontSize: 15, lineHeight: 22 },
});
