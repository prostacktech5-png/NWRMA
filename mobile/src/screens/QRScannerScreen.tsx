import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';

/** Minimum gap between duplicate scan callbacks (camera may fire rapidly). */
const SCAN_DEBOUNCE_MS = 1200;

function parseQrPayload(data: string): string {
  const trimmed = data.trim();
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return trimmed;
  }
}

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<{ type: string; data: string; at: string } | null>(null);
  const lastDataRef = useRef<string | null>(null);
  const lastTsRef = useRef(0);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    const now = Date.now();
    const { data, type } = result;
    if (data === lastDataRef.current && now - lastTsRef.current < SCAN_DEBOUNCE_MS) {
      return;
    }
    lastDataRef.current = data;
    lastTsRef.current = now;
    setLastScan({
      type,
      data,
      at: new Date().toISOString(),
    });
  }, []);

  const simulateScanDev = useCallback(() => {
    if (!__DEV__) return;
    handleBarcodeScanned({
      type: 'qr',
      data: JSON.stringify({
        demo: true,
        stationHint: 'Sewa River — Bo',
        note: 'Dev-only simulated QR payload',
      }),
      bounds: { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
      cornerPoints: [],
    });
  }, [handleBarcodeScanned]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.muted}>Checking camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Ionicons name="qr-code-outline" size={56} color={COLORS.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>Allow the camera to scan gauge / station QR codes.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Grant permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan QR</Text>
        <Text style={styles.headerSub}>Point at a station or setup code</Text>
      </View>

      <View style={styles.cameraWrap} onLayout={onLayout}>
        {layout.width > 0 && layout.height > 0 ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : null}
        <View style={styles.reticle} pointerEvents="none">
          <View style={styles.reticleInner} />
        </View>
      </View>

      {__DEV__ ? (
        <Pressable style={styles.simBtn} onPress={simulateScanDev}>
          <Text style={styles.simBtnText}>Dev: simulate QR scan</Text>
        </Pressable>
      ) : null}

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <Text style={styles.panelLabel}>Last scan</Text>
        {lastScan ? (
          <>
            <Text style={styles.meta}>
              {lastScan.type} · {lastScan.at}
            </Text>
            <Text style={styles.raw}>{parseQrPayload(lastScan.data)}</Text>
          </>
        ) : (
          <Text style={styles.muted}>No QR detected yet. Aim the camera at a QR code.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  cameraWrap: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  reticle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleInner: {
    width: '62%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  simBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  simBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  panel: { flex: 1, marginTop: 8 },
  panelContent: { padding: 16, paddingBottom: 32 },
  panelLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 8 },
  meta: { fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  raw: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: COLORS.foreground,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.foreground, marginBottom: 8 },
  body: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  muted: { fontSize: 14, color: COLORS.muted },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
