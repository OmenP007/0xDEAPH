import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types/escrow';
import { api, ApiError } from '@/lib/api';

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

function profileFromToken(token: string, fallback: Partial<UserProfile> = {}): UserProfile {
  const decoded = decodeJwt(token);
  return {
    id: decoded.user_id || fallback.id || 0,
    username: decoded.username || fallback.username || 'utilisateur',
    email: decoded.email || fallback.email || '',
    role: (decoded.role || fallback.role || 'client') as UserRole,
    is_kyc_approved: decoded.is_kyc_approved ?? fallback.is_kyc_approved ?? false,
    full_name: decoded.full_name || fallback.full_name,
    phone: fallback.phone,
  };
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
    role?: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistUser(profile: UserProfile | null) {
  if (profile) {
    localStorage.setItem('trust_user', JSON.stringify(profile));
  } else {
    localStorage.removeItem('trust_user');
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('trust_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((profile: UserProfile | null) => {
    setUserState(profile);
    persistUser(profile);
  }, []);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const profile = await api.getMe();
      setUser(profile);
      setToken(api.getToken());
      return profile;
    } catch (error) {
      // Only an actual authentication rejection should end the session.
      // Network failures and 429/5xx responses are transient.
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = api.getToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const storedUser = localStorage.getItem('trust_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as UserProfile;
          // Display instantly, then refresh from the API for an authoritative role/KYC state.
          setUserState(parsed);
        } catch {
          setUserState(profileFromToken(storedToken));
        }
      } else {
        setUser(profileFromToken(storedToken));
      }

      try {
        const profile = await refreshUser();
        if (!profile) {
          // API temporarily unreachable (429/5xx): keep the cached session.
          // The token remains usable and a later request will refresh it.
        }
      } catch {
        // Token (and refresh token) are unusable: drop the stale session.
        api.logout();
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    };
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      setUserState(null);
      setToken(null);
      localStorage.removeItem('trust_user');
    };
    window.addEventListener('trust:auth-expired', onAuthExpired);
    return () => window.removeEventListener('trust:auth-expired', onAuthExpired);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      const profile: UserProfile =
        res.user ||
        profileFromToken(res.access, {
          id: res.user_id,
          username: res.username || username,
          email: res.email,
          role: res.role as UserRole,
        });
      setUser(profile);
      setToken(res.access);
      // Keep profile fields (full_name, phone, kyc_status) in sync with the backend.
      // A transient failure here must not invalidate a successful login.
      await refreshUser().catch(() => null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
    role?: string;
  }) => {
    setIsLoading(true);
    try {
      await api.register(data);
      await login(data.username, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
        setUser,
        refreshUser,
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
