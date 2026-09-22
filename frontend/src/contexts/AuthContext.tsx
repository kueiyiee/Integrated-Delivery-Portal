import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

export function useAuth() {
  return useContext(AuthContext);
}

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
  const hydratedTokenRef = useRef<string | null>(null);
  const hydrationRequestRef = useRef(0);

  const clearUserView = useCallback(() => {
    setUser(null);
    hydratedTokenRef.current = null;
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const clearAuthState = useCallback(() => {
    safeRemoveToken();
    hydratedTokenRef.current = null;
    setToken(null);
    setUser(null);
    setLoading(false);
    setInitializing(false);
  }, []);

  const storeUserCache = useCallback((nextUser: any, remember: boolean) => {
    try {
      safeStoreUser(nextUser, remember);
    } catch {
      // ignore storage failures
    }
  }, []);

  const hydrateUserForToken = useCallback(async (nextToken: string, remember: boolean, preferExistingUser?: any | null) => {
    loadingRef.current = true;
    setLoading(true);
    setInitializing(true);
    clearUserView();

    try {
      const freshUser = preferExistingUser ?? await fetchMe();
      setUser(freshUser);
      hydratedTokenRef.current = nextToken;
      storeUserCache(freshUser, remember);
      return freshUser;
    } catch (err) {
      clearAuthState();
      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitializing(false);
    }
  }, [clearAuthState, clearUserView, storeUserCache]);

  // restore user when token exists, with a safety timeout to recover from hung requests
  useEffect(() => {
    let mounted = true;
    let hydrationTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const requestId = hydrationRequestRef.current + 1;
    hydrationRequestRef.current = requestId;

    if (!token) {
      setUser(null);
      hydratedTokenRef.current = null;
      setLoading(false);
      setInitializing(false);
      return;
    }

    if (user && hydratedTokenRef.current === token) {
      setLoading(false);
      setInitializing(false);
      return;
    }

    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setInitializing(true);

    // Safety timeout: if hydration takes longer than 15 seconds, clear the loading state
    // to prevent the UI from being stuck indefinitely due to hung network requests.
    hydrationTimeoutId = setTimeout(() => {
      if (!mounted || hydrationRequestRef.current !== requestId) return;
      loadingRef.current = false;
      setLoading(false);
      setInitializing(false);
    }, 15000);

    fetchMe()
      .then((u) => {
        if (!mounted || hydrationRequestRef.current !== requestId) return;
        if (hydrationTimeoutId) clearTimeout(hydrationTimeoutId);
        setUser(u);
        hydratedTokenRef.current = token;
        setInitializing(false);
        storeUserCache(u, Boolean(localStorage.getItem(STORAGE_KEY)));
      })
      .catch((err) => {
        if (!mounted || hydrationRequestRef.current !== requestId) return;
        if (hydrationTimeoutId) clearTimeout(hydrationTimeoutId);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearAuthState();
          return;
        }

        clearAuthState();
      })
      .finally(() => {
        if (hydrationTimeoutId) clearTimeout(hydrationTimeoutId);
        if (hydrationRequestRef.current === requestId) {
          loadingRef.current = false;
        }
        if (mounted && hydrationRequestRef.current === requestId) {
          setLoading(false);
          setInitializing(false);
        }
      });

    return () => {
      mounted = false;
      if (hydrationTimeoutId) clearTimeout(hydrationTimeoutId);
      if (hydrationRequestRef.current === requestId) {
        loadingRef.current = false;
      }
    };
  }, [token, clearAuthState, storeUserCache]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setInitializing(false);
    clearUserView();

    try {
      const u = await fetchMe();
      setUser(u);
      hydratedTokenRef.current = token;
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
  }, [clearUserView, storeUserCache, token]);

  const login = useCallback(async (nextToken: string, remember = true, initialUser: any | null = null) => {
    safeStoreToken(nextToken, remember);
    setToken(nextToken);

    if (initialUser && Array.isArray(initialUser.roles)) {
      setUser(initialUser);
      hydratedTokenRef.current = nextToken;
      storeUserCache(initialUser, remember);
      setLoading(false);
      setInitializing(false);
      return;
    }

    await hydrateUserForToken(nextToken, remember);
  }, [hydrateUserForToken, storeUserCache]);

  const logout = useCallback(async () => {
    const tokenAtLogout = token;
    // Clear the local session immediately. The API request still revokes the
    // server token and records the audit event without blocking navigation.
    clearAuthState();
    void logoutRequest(tokenAtLogout).catch(() => {
      // The local session is already cleared when the server is unavailable.
    });
  }, [clearAuthState, token]);

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
