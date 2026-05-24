import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { v4 as uuid } from 'uuid';
import type { User } from './db';
import { hydroStore } from './db';
import {
  ensureNwrmaApiJwt,
  nwrmaApiHeaders,
  phoneLoginVariants,
  resolveNwrmaServerBaseAsync,
  setNwrmaApiJwt,
} from './nwrma-api';

const SESSION_KEY = 'hydrogauge_user_id';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (phone: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem(SESSION_KEY);
        if (storedUserId) {
          const existingUser = await hydroStore.getUserById(storedUserId);
          if (existingUser) {
            setUser(existingUser);
            void ensureNwrmaApiJwt();
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.error('Session check failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    void checkSession();
  }, []);

  const login = useCallback(
    async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const normalizedPhone = phone.trim();
        await setNwrmaApiJwt(null);
        const base = (await resolveNwrmaServerBaseAsync()).trim();

        if (base) {
          try {
            let lastApiError = 'Invalid phone or password (API).';
            let apiAuthFailed = false;

            for (const phoneVariant of phoneLoginVariants(normalizedPhone)) {
              const res = await fetch(`${base}/auth/login`, {
                method: 'POST',
                headers: nwrmaApiHeaders(),
                body: JSON.stringify({ phone: phoneVariant, password }),
              });

              const rawText = await res.text();
              let data = {} as Record<string, unknown>;
              try {
                data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
              } catch {
                break;
              }

              const token = typeof data.token === 'string' ? data.token : '';
              const uRaw =
                typeof data.user === 'object' && data.user !== null
                  ? (data.user as Record<string, unknown>)
                  : null;

              if (res.ok && token && uRaw?.id && typeof uRaw.fullName === 'string') {
                await setNwrmaApiJwt(token);
                const remotePhone =
                  typeof uRaw.phone === 'string' ? uRaw.phone.trim() : normalizedPhone;
                const now = new Date().toISOString();
                const syncedUser: User = {
                  id: String(uRaw.id),
                  phone: remotePhone || normalizedPhone,
                  name: uRaw.fullName.trim(),
                  password,
                  createdAt: typeof uRaw.createdAt === 'string' ? String(uRaw.createdAt) : now,
                };
                await hydroStore.addUser(syncedUser);
                await AsyncStorage.setItem(SESSION_KEY, syncedUser.id);
                setUser(syncedUser);
                void ensureNwrmaApiJwt({ forceRefresh: true });
                return { success: true };
              }

              if (res.status === 401 || res.status === 403) {
                apiAuthFailed = true;
                lastApiError =
                  typeof data.error === 'string' ? data.error : 'Invalid phone or password (API).';
                continue;
              }

              if (res.status !== 401 && res.status !== 403 && res.status !== 409) {
                break;
              }

              return {
                success: false,
                error:
                  typeof data.error === 'string' ? data.error : 'Invalid phone or password (API).',
              };
            }

            if (apiAuthFailed) {
              return { success: false, error: lastApiError };
            }
          } catch (e) {
            console.warn('API login unreachable, trying offline session:', e);
          }
        }

        const existingUser = await hydroStore.getUserByPhone(normalizedPhone);
        if (!existingUser) {
          return { success: false, error: 'User not found. Please register first.' };
        }
        if (existingUser.password !== password) {
          return { success: false, error: 'Incorrect password.' };
        }
        await AsyncStorage.setItem(SESSION_KEY, existingUser.id);
        setUser(existingUser);
        void ensureNwrmaApiJwt({ forceRefresh: true });
        return { success: true };
      } catch (e) {
        console.error('Login error:', e);
        if (e instanceof TypeError || (e instanceof Error && /network|fetch/i.test(e.message))) {
          return {
            success: false,
            error: 'Cannot reach the server. Check your internet connection and try again.',
          };
        }
        return { success: false, error: 'Login failed. Please try again.' };
      }
    },
    [],
  );

  const register = useCallback(
    async (
      phone: string,
      name: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const normalizedPhone = phone.trim();
        await setNwrmaApiJwt(null);
        const base = (await resolveNwrmaServerBaseAsync()).trim();

        let useOfflineRegister = !base;

        if (base) {
          try {
            let lastRawText = '';
            let lastStatus = 0;
            let lastData = {} as Record<string, unknown>;

            for (const phoneVariant of phoneLoginVariants(normalizedPhone)) {
              const res = await fetch(`${base}/auth/register`, {
                method: 'POST',
                headers: nwrmaApiHeaders(),
                body: JSON.stringify({
                  phone: phoneVariant,
                  name: name.trim(),
                  password,
                }),
              });

              lastRawText = await res.text();
              lastStatus = res.status;
              try {
                lastData = lastRawText
                  ? (JSON.parse(lastRawText) as Record<string, unknown>)
                  : {};
              } catch {
                useOfflineRegister = true;
                break;
              }

              const token = typeof lastData.token === 'string' ? lastData.token : '';
              const uRaw =
                typeof lastData.user === 'object' && lastData.user !== null
                  ? (lastData.user as Record<string, unknown>)
                  : null;

              if (res.ok && token && uRaw?.id && typeof uRaw.fullName === 'string') {
                await setNwrmaApiJwt(token);
                const now = new Date().toISOString();
                const syncedUser: User = {
                  id: String(uRaw.id),
                  phone:
                    typeof uRaw.phone === 'string'
                      ? uRaw.phone.trim() || normalizedPhone
                      : normalizedPhone,
                  name: uRaw.fullName.trim(),
                  password,
                  createdAt: now,
                };
                await hydroStore.addUser(syncedUser);
                await AsyncStorage.setItem(SESSION_KEY, syncedUser.id);
                setUser(syncedUser);
                void ensureNwrmaApiJwt({ forceRefresh: true });
                return { success: true };
              }

              if (res.status === 409) {
                const apiErr =
                  typeof lastData.error === 'string'
                    ? lastData.error
                    : 'Phone already registered — try Login.';
                return { success: false, error: apiErr };
              }

              if (res.status === 401 || res.status === 403) continue;
            }

            const tunnelHtml =
              lastRawText.includes('<!DOCTYPE') ||
              lastRawText.includes('loca.lt') ||
              lastRawText.toLowerCase().includes('cloudflare');
            const retryable =
              useOfflineRegister ||
              tunnelHtml ||
              lastStatus === 408 ||
              lastStatus === 502 ||
              lastStatus === 503 ||
              lastStatus === 504;

            if (retryable) {
              useOfflineRegister = true;
            } else if (lastStatus > 0) {
              const apiErr =
                typeof lastData.error === 'string'
                  ? lastData.error
                  : typeof lastData.message === 'string'
                    ? lastData.message
                    : lastStatus === 409
                      ? 'Phone already registered — try Login.'
                      : `Server error (${lastStatus}).`;
              return { success: false, error: apiErr };
            }
          } catch (e) {
            console.warn('API register unreachable, using offline account:', e);
            useOfflineRegister = true;
          }
        }

        if (!useOfflineRegister) {
          return { success: false, error: 'Registration failed (API). Try again.' };
        }

        const existingUser = await hydroStore.getUserByPhone(normalizedPhone);
        if (existingUser) {
          return { success: false, error: 'Phone number already registered. Please login.' };
        }
        const now = new Date().toISOString();
        const newUser: User = {
          id: uuid(),
          phone: normalizedPhone,
          name: name.trim(),
          password,
          createdAt: now,
        };
        await hydroStore.addUser(newUser);
        await AsyncStorage.setItem(SESSION_KEY, newUser.id);
        setUser(newUser);
        void ensureNwrmaApiJwt({ forceRefresh: true });
        return { success: true };
      } catch (e) {
        console.error('Registration error:', e);
        if (e instanceof TypeError || (e instanceof Error && /network|fetch/i.test(e.message))) {
          return {
            success: false,
            error: 'Cannot reach the server. Check your internet connection and try again.',
          };
        }
        return { success: false, error: 'Registration failed. Please try again.' };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    await setNwrmaApiJwt(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
