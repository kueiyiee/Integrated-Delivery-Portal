import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMe, logoutRequest, ApiError } from '../services/auth';

interface AuthContextValue {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
  login: (token: string, remember?: boolean, initialUser?: any | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

const STORAGE_KEY = 'idp_token';
const USER_STORAGE_KEY = 'idp_user';

const safeGetStoredToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeGetStoredUser = () => {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY) ?? sessionStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const safeStoreToken = (token: string, remember: boolean) => {
  try {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, token);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, token);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

const safeStoreUser = (user: any, remember: boolean) => {
  try {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    otherStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

const safeRemoveToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {}
};

export const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  initializing: true,
  login: async () => undefined,
  logout: async () => undefined,
  refreshUser: async () => undefined,
  hasPermission: () => false,
  hasRole: () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => safeGetStoredToken());
  // Browser storage is only a convenience cache. The authenticated backend response
  // remains the source of truth for identity and company membership.
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(() => Boolean(safeGetStoredToken()));
  const loadingRef = useRef(false);

  const clearAuthState = useCallback(() => {
    safeRemoveToken();
    setToken(null);
    setUser(null);
    setLoading(false);
    setInitializing(false);
  }, []);

  // restore user when token exists, without adding a long blocking timeout.
  useEffect(() => {
    let mounted = true;

    if (!token) {
      setUser(null);
      setLoading(false);
      setInitializing(false);
      return;
    }

    // Do not trust cached user data as the primary identity. Rehydrate from the
    // authenticated backend before the app considers the user active.
    if (user) {
      setLoading(false);
      setInitializing(false);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setInitializing(true);

    fetchMe()
      .then((u) => {
        if (!mounted) return;
        setUser(u);
        setInitializing(false);
        safeStoreUser(u, Boolean(localStorage.getItem(STORAGE_KEY)));
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearAuthState();
          return;
        }

        clearAuthState();
      })
      .finally(() => {
        loadingRef.current = false;
        if (mounted) {
          setLoading(false);
          setInitializing(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token, user, clearAuthState]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setInitializing(false);

    try {
      const u = await fetchMe();
      setUser(u);
      safeStoreUser(u, Boolean(localStorage.getItem(STORAGE_KEY)));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        safeRemoveToken();
        setToken(null);
        setUser(null);
      }
      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitializing(false);
    }
  }, [token]);

  const login = useCallback(async (nextToken: string, remember = true, initialUser: any | null = null) => {
    safeStoreToken(nextToken, remember);
    setToken(nextToken);
    setLoading(true);

    if (initialUser) {
      setUser(initialUser);
      safeStoreUser(initialUser, remember);
      setLoading(false);
      return;
    }

    try {
      const u = await fetchMe();
      setUser(u);
      safeStoreUser(u, remember);
    } catch (err) {
      clearAuthState();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  const logout = useCallback(async () => {
    clearAuthState();

    try {
      await logoutRequest();
    } catch {
      // ignore server-side logout errors; local session must be cleared immediately
    }
  }, [clearAuthState]);

  useEffect(() => {
    const onUnauthorized = () => {
      clearAuthState();
    };

    window.addEventListener('auth:unauthorized', onUnauthorized as EventListener);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized as EventListener);
  }, []);

  const permissions = useMemo(() => {
    if (!user || !Array.isArray(user.roles)) return new Set<string>();
    return new Set(user.roles.flatMap((role: any) => (Array.isArray(role.permissions) ? role.permissions.map((p: any) => p.name) : [])));
  }, [user]);

  const hasPermission = useCallback((permission: string) => permissions.has(permission), [permissions]);

  const hasRole = useCallback(
    (roleName: string) => {
      if (!user || !Array.isArray(user.roles)) return false;
      return user.roles.some((role: any) => role.name === roleName);
    },
    [user],
  );

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), loading, initializing, login, logout, refreshUser, hasPermission, hasRole }),
    [token, user, loading, initializing, login, logout, refreshUser, hasPermission, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
