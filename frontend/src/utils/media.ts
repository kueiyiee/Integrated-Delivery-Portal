import { api } from '../api';

export function getOrganizationLogoUrl(value?: string | null): string | null {
  return resolveMediaUrl(value);
}

export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('data:')) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
    return trimmed;
  }

  const backendOrigin = getBackendOrigin();

  if (trimmed.startsWith('storage/')) {
    return `${backendOrigin}/${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('/storage/')) {
      return `${backendOrigin}${trimmed}`;
    }
    return `${backendOrigin}${trimmed}`;
  }

  if (trimmed.includes('storage/')) {
    return `${backendOrigin}/${trimmed.replace(/^\//, '')}`;
  }

  if (trimmed.includes('company_logos/') || trimmed.includes('profile_photos/')) {
    return `${backendOrigin}/storage/${trimmed.replace(/^\//, '')}`;
  }

  return trimmed;
}

function getBackendOrigin(): string {
  const envBackend = (import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_URL ?? '').trim();

  if (envBackend) {
    return envBackend.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }

  const configured = api.defaults.baseURL ?? '';
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const fallback = window.location.origin.replace(/\/$/, '');
    return fallback === 'http://localhost:5173' ? 'http://localhost:8000' : fallback;
  }

  return 'http://localhost:8000';
}
