'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from './ToastContext';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  quickLogin: (type: 'admin' | 'member1' | 'member2') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const toast = useToast();
  const router = useRouter();

  // Load user on initialization
  useEffect(() => {
    const savedToken = localStorage.getItem('spacesync_token');
    const savedUser = localStorage.getItem('spacesync_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('spacesync_token');
        localStorage.removeItem('spacesync_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res: any = await api.post('/auth/login', { email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('spacesync_token', res.token);
      localStorage.setItem('spacesync_user', JSON.stringify(res.user));
      toast.success(`Welcome back, ${res.user.name}!`);

      if (res.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      throw err;
    }
  }, [router, toast]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole = 'member') => {
    try {
      const res: any = await api.post('/auth/register', { name, email, password, role });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('spacesync_token', res.token);
      localStorage.setItem('spacesync_user', JSON.stringify(res.user));
      toast.success(`Account created successfully. Welcome, ${res.user.name}!`);

      if (res.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      throw err;
    }
  }, [router, toast]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('spacesync_token');
    localStorage.removeItem('spacesync_user');
    toast.info('You have been logged out.');
    router.push('/login');
  }, [router, toast]);

  const quickLogin = useCallback(async (type: 'admin' | 'member1' | 'member2') => {
    if (type === 'admin') {
      await login('admin@spacesync.io', 'Admin123!');
    } else if (type === 'member1') {
      await login('member1@spacesync.io', 'Member123!');
    } else if (type === 'member2') {
      await login('member2@spacesync.io', 'Member123!');
    }
  }, [login]);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        quickLogin,
      }}
    >
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
