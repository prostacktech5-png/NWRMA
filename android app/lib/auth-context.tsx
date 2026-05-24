'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { db, type User } from './db';
import { v4 as uuid } from 'uuid';

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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUserId = localStorage.getItem('hydrogauge_user_id');
        if (storedUserId) {
          const existingUser = await db.users.get(storedUserId);
          if (existingUser) {
            setUser(existingUser);
          } else {
            localStorage.removeItem('hydrogauge_user_id');
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedPhone = phone.trim();
      const existingUser = await db.users.where('phone').equals(normalizedPhone).first();
      
      if (!existingUser) {
        return { success: false, error: 'User not found. Please register first.' };
      }

      // Simple password check (in production, use proper hashing)
      if (existingUser.password !== password) {
        return { success: false, error: 'Incorrect password.' };
      }

      localStorage.setItem('hydrogauge_user_id', existingUser.id);
      setUser(existingUser);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (phone: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedPhone = phone.trim();
      
      // Check if user already exists
      const existingUser = await db.users.where('phone').equals(normalizedPhone).first();
      if (existingUser) {
        return { success: false, error: 'Phone number already registered. Please login.' };
      }

      const newUser: User = {
        id: uuid(),
        phone: normalizedPhone,
        name: name.trim(),
        password, // In production, hash this
        createdAt: new Date(),
      };

      await db.users.add(newUser);
      localStorage.setItem('hydrogauge_user_id', newUser.id);
      setUser(newUser);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('hydrogauge_user_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
