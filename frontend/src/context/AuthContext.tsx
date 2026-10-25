import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types/escrow';
import { api } from '@/lib/api';
import { MOCK_USER } from '@/lib/mock-data';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; password2: string }) => Promise<void>;
  logout: () => void;
  toggleDemoMode: () => void;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('trust_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to demo user if demo mode is enabled
    const demo = localStorage.getItem('trust_demo_mode') === 'true';
    return demo ? MOCK_USER : null;
  });

  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('trust_demo_mode');
    return saved === null ? true : saved === 'true'; // Default demo mode active on first run for instant evaluation
  });

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = api.getToken();
      if (storedToken) {
        setToken(storedToken);
        const storedUser = localStorage.getItem('trust_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // fallback
          }
        }
      } else if (isDemoMode && !user) {
        setUser(MOCK_USER);
      }
      setIsLoading(false);
    };
    initAuth();
  }, [isDemoMode]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      setToken(res.access);
      const userProfile: UserProfile = {
        id: (res as any).user_id || 1,
        username: (res as any).username || username,
        email: `${username}@example.com`,
        role: (res as any).role || 'client',
        is_kyc_approved: true,
      };
      setUser(userProfile);
      localStorage.setItem('trust_user', JSON.stringify(userProfile));
      setIsDemoMode(false);
      api.setDemoMode(false);
    } catch (err) {
      // If backend login failed and demo mode is desired
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { username: string; email: string; password: string; password2: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      // Automatically login afterwards
      await login(data.username, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('trust_user');
  };

  const toggleDemoMode = () => {
    const nextVal = !isDemoMode;
    setIsDemoMode(nextVal);
    api.setDemoMode(nextVal);
    if (nextVal) {
      setUser(MOCK_USER);
    } else if (!token) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: isDemoMode || Boolean(token && user),
        isLoading,
        isDemoMode,
        login,
        register,
        logout,
        toggleDemoMode,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
