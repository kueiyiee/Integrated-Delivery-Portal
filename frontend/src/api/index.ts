import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL?.trim();
const apiUrlEnv = import.meta.env.VITE_API_URL?.trim();

const normalizeApiUrl = (value: string) => value.replace(/\/$/, '');
const isLocalhostApi = (value: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value);

let baseURL: string;
if (import.meta.env.DEV && apiUrlEnv && isLocalhostApi(apiUrlEnv)) {
  // In dev, use Vite proxy instead of client-local host URLs so remote devices work.
  baseURL = '/api';
} else if (apiUrlEnv) {
  baseURL = normalizeApiUrl(apiUrlEnv);
} else if (backendUrl) {
  baseURL = normalizeApiUrl(backendUrl) + '/api';
} else {
  baseURL = '/api';
}

if (import.meta.env.DEV) {
  console.debug('[api] baseURL set to', baseURL);
}

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 60000) || 60000;

const STORAGE_KEY = 'idp_token';
const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const makeRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const api = axios.create({
  baseURL,
  timeout: configuredTimeout,
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.debug('[api] request', config.method, config.url, config.baseURL, config.timeout);
  }
  return config;
});

// Request interceptor: attach token, request id and standard headers
api.interceptors.request.use((config) => {
  const token = getStoredToken();

  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!config.headers.Accept) config.headers.Accept = 'application/json';

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  // add a lightweight request id for tracing
  if (!config.headers['X-Request-Id']) config.headers['X-Request-Id'] = makeRequestId();

  return config;
});

// Response interceptor: surface 401 -> clear token and notify app
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('idp_user');
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('idp_user');
      } catch {
        // ignore storage errors
      }

      // emit an event so AuthContext or other parts of the app can react.
      // Avoid a hard reload here so the app clears state immediately and stays fast.
      try {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status } }));
      } catch {
        // ignore events in restricted contexts
      }
    }

    return Promise.reject(err);
  },
);
