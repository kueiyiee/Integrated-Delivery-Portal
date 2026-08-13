import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveMediaUrl } from '../media';

describe('resolveMediaUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps local blob preview URLs so uploads can display immediately', () => {
    const blobUrl = 'blob:http://localhost:5173/12345';
    expect(resolveMediaUrl(blobUrl)).toBe(blobUrl);
  });

  it('resolves storage URLs against the backend origin', () => {
    expect(resolveMediaUrl('/storage/company_logos/acme.png')).toBe('http://localhost:8000/storage/company_logos/acme.png');
  });

  it('rejects embedded data URIs for security', () => {
    const dataUrl = 'data:image/png;base64,AAAA';
    expect(resolveMediaUrl(dataUrl)).toBeNull();
  });
});
