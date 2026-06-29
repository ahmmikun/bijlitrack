'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeRefId: string | null;
  setActiveRefId: (id: string | null) => void;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeRefId, setActiveRefIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedRefId = localStorage.getItem('activeRefId');
    if (savedRefId) setActiveRefIdState(savedRefId);

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error: any) {
          // Only remove token if server explicitly says it's invalid (401)
          // Don't remove on network errors, timeouts, or server errors (5xx)
          if (error?.response?.status === 401) {
            console.error('Token expired or invalid, logging out');
            localStorage.removeItem('token');
          } else {
            console.warn('Auth check failed (network/server error), keeping token. Retrying...', error?.message);
            // Retry once after a short delay (handles Railway cold starts)
            try {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const retryRes = await api.get('/auth/me');
              setUser(retryRes.data);
            } catch (retryError: any) {
              if (retryError?.response?.status === 401) {
                localStorage.removeItem('token');
              } else {
                // Still failed but token might be valid — try to decode basic info from JWT
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  // Check if token is expired
                  if (payload.exp && payload.exp * 1000 > Date.now()) {
                    setUser({ id: payload.id, name: 'User', email: '' });
                  } else {
                    localStorage.removeItem('token');
                  }
                } catch {
                  // Can't decode token, remove it
                  localStorage.removeItem('token');
                }
              }
            }
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const setActiveRefId = (id: string | null) => {
    setActiveRefIdState(id);
    if (id) {
      localStorage.setItem('activeRefId', id);
    } else {
      localStorage.removeItem('activeRefId');
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeRefId');
    setUser(null);
    setActiveRefIdState(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, activeRefId, setActiveRefId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
