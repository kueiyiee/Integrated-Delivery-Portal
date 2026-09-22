import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('keeps the Vite dev proxy for local relative URLs', () => {
    expect(resolveApiBaseUrl({ apiUrlEnv: '/api', backendUrl: '', isDev: true, hostname: 'localhost' })).toBe('/api');
  });

  it('falls back to the deployed backend in production when only a relative API path is configured', () => {
    expect(resolveApiBaseUrl({ apiUrlEnv: '/api', backendUrl: '', isDev: false, hostname: 'bilconstructiontecx.org' })).toBe('https://integrated-delivery-portal-api.onrender.com/api');
  });

  it('uses the configured backend URL when provided', () => {
    expect(resolveApiBaseUrl({ apiUrlEnv: 'https://api.example.com', backendUrl: '', isDev: false, hostname: 'app.example.com' })).toBe('https://api.example.com');
  });
});
