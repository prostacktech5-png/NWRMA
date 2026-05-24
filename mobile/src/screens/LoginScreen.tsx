import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';

type Mode = 'login' | 'register';

const BLUE = '#1d4ed8';
const BLUE_DARK = '#1e40af';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regPhone, setRegPhone] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const onLogin = async () => {
    setError('');
    setIsLoading(true);
    const result = await login(loginPhone, loginPassword);
    if (!result.success) setError(result.error ?? 'Login failed');
    setIsLoading(false);
  };

  const onRegister = async () => {
    setError('');
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (regPhone.trim().length < 6) {
      setError('Enter a valid phone number (at least 6 digits)');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    const result = await register(regPhone, regName, regPassword);
    if (!result.success) setError(result.error ?? 'Registration failed');
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoRing}>
              <Image
                source={require('../../assets/logo-nwrma.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>HydroGauge SL</Text>
            <Text style={styles.brandSub}>National Water Resources Management Agency</Text>
            <View style={styles.flag}>
              <View style={[styles.flagStripe, { backgroundColor: '#1EB53A' }]} />
              <View style={[styles.flagStripe, { backgroundColor: '#fff' }]} />
              <View style={[styles.flagStripe, { backgroundColor: '#D4A017' }]} />
            </View>
          </View>

          <View style={styles.card}>
            {mode === 'login' ? (
              <>
                <Text style={styles.cardTitle}>Field Officer Login</Text>
                <Text style={styles.cardSub}>Ministry of Water Resources · Sierra Leone</Text>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+232 XX XXX XXXX"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    value={loginPhone}
                    onChangeText={setLoginPhone}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithRight]}
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showLoginPassword}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowLoginPassword((v) => !v)}
                    accessibilityLabel="Toggle password visibility"
                  >
                    <Ionicons
                      name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.signInBtn, isLoading && styles.btnDisabled]}
                  onPress={() => void onLogin()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signInBtnText}>Sign In  →</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.switchMode}
                  onPress={() => {
                    setMode('register');
                    setError('');
                  }}
                >
                  <Text style={styles.switchMuted}>New officer? </Text>
                  <Text style={styles.switchLink}>Create Account</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Create Account</Text>
                <Text style={styles.cardSub}>
                  Register as a field officer to submit water level readings
                </Text>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mohamed Kamara"
                    placeholderTextColor="#9ca3af"
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>

                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+232 XX XXX XXXX"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    value={regPhone}
                    onChangeText={setRegPhone}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithRight]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showRegPassword}
                    value={regPassword}
                    onChangeText={setRegPassword}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowRegPassword((v) => !v)}>
                    <Ionicons
                      name={showRegPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithRight]}
                    placeholder="Re-enter password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showRegConfirm}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowRegConfirm((v) => !v)}>
                    <Ionicons
                      name={showRegConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.createBtn, isLoading && styles.btnDisabled]}
                  onPress={() => void onRegister()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={20} color="#fff" />
                      <Text style={styles.createBtnText}>Create Account</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={styles.switchMode}
                  onPress={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  <Text style={styles.switchMuted}>Already have an account? </Text>
                  <Text style={styles.switchLink}>Sign In</Text>
                </Pressable>
              </>
            )}
          </View>

          <Text style={styles.footer}>Sierra Leone Hydrological Data System © 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BLUE },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  hero: { alignItems: 'center', marginBottom: 20 },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: { width: 84, height: 84 },
  brandTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  flag: {
    flexDirection: 'row',
    width: 72,
    height: 5,
    marginTop: 14,
    borderRadius: 2,
    overflow: 'hidden',
  },
  flagStripe: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputWithRight: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    padding: 6,
  },
  signInBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  createBtn: {
    backgroundColor: '#1EB53A',
    borderRadius: 10,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.7 },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  switchMuted: { fontSize: 14, color: '#6b7280' },
  switchLink: { fontSize: 14, fontWeight: '700', color: BLUE_DARK },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 20,
  },
});
