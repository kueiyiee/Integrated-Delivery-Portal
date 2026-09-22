export const DEFAULT_LOCAL_BACKEND_URL = 'http://localhost:8000';
export const DEFAULT_DEPLOYED_BACKEND_URL = 'https://integrated-delivery-portal-api.onrender.com';

export function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export function appendApiPath(value: string): string {
  const normalized = normalizeApiUrl(value);
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export function resolveApiBaseUrl({
  apiUrlEnv,
  backendUrl,
  isDev,
  hostname,
}: {
  apiUrlEnv?: string;
  backendUrl?: string;
  isDev: boolean;
  hostname: string;
}): string {
  const explicitApi = apiUrlEnv?.trim();
  const explicitBackend = backendUrl?.trim();
  const isLocalBrowser = /^(localhost|127\.0\.0\.1)$/i.test(hostname);

  if (explicitApi && /^https?:\/\//i.test(explicitApi)) {
    return normalizeApiUrl(explicitApi);
  }

  if (explicitBackend && /^https?:\/\//i.test(explicitBackend)) {
    return appendApiPath(explicitBackend);
  }

  if (explicitApi && explicitApi.startsWith('/')) {
    if (isDev) {
      return '/api';
    }

    return appendApiPath(DEFAULT_DEPLOYED_BACKEND_URL);
  }

  if (explicitBackend && explicitBackend.startsWith('/')) {
    return appendApiPath(explicitBackend);
  }

  if (isLocalBrowser && !explicitApi && !explicitBackend) {
    return appendApiPath(DEFAULT_LOCAL_BACKEND_URL);
  }

  if (isDev) {
    return '/api';
  }

  return appendApiPath(DEFAULT_DEPLOYED_BACKEND_URL);
}
